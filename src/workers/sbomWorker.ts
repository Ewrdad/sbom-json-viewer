import { convertJsonToBom } from "../lib/bomConverter";
import { Formatter } from "../renderer/Formatter/Formatter";
import { calculateSbomStats } from "../lib/statsUtils";

/**
 * SBOM Worker
 * Handles heavy lifting: JSON parsing, SBOM conversion, formatting, and stats.
 */

self.onmessage = async (e: MessageEvent) => {
  const { jsonText, url, file, filename: providedFilename } = e.data;
  const filename = providedFilename || (file ? file.name : (url ? url.split('/').pop() : 'SBOM'));

  if (import.meta.env.DEV) {
    console.log(`[Worker] Started processing ${filename}`);
  }

  try {
    let finalJsonText = jsonText;

    // 1. Get JSON Text (either from direct string, URL or File)
    if (url) {
      self.postMessage({ type: "progress", message: `Downloading ${filename}...`, progress: 0 });
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch SBOM from ${url}`);
      
      const reader = response.body?.getReader();
      const contentLength = Number(response.headers.get("Content-Length") || 0);
      
      if (reader) {
        const chunks: Uint8Array[] = [];
        let loaded = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.length;
          if (contentLength) {
            self.postMessage({ type: "progress", message: `Downloading ${filename}...`, progress: (loaded / contentLength) * 100 });
          }
        }
        const combined = new Uint8Array(loaded);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        finalJsonText = new TextDecoder().decode(combined);
      } else {
        finalJsonText = await response.text();
      }
    } else if (file) {
      self.postMessage({ type: "progress", message: `Reading ${filename}...`, progress: 0 });
      // Using stream reader to report progress for local files too
      const reader = file.stream().getReader();
      const chunks: Uint8Array[] = [];
      let loaded = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        self.postMessage({ type: "progress", message: `Reading ${filename}...`, progress: (loaded / file.size) * 100 });
      }
      const combined = new Uint8Array(loaded);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      finalJsonText = new TextDecoder().decode(combined);
    }

    if (!finalJsonText) throw new Error("No SBOM data provided or found");

    // 2. Parse JSON
    self.postMessage({ type: "progress", message: `Parsing ${filename}...`, progress: 0 });
    const json = JSON.parse(finalJsonText);
    // Help GC by clearing the large string if possible
    finalJsonText = ""; 
    
    if (import.meta.env.DEV) console.log(`[Worker] JSON parsed`);

    // 3. Convert to Bom
    self.postMessage({ type: "progress", message: "Converting to CycloneDX model...", progress: 5 });
    const bom = await convertJsonToBom(json);
    if (import.meta.env.DEV) console.log(`[Worker] Bom converted`);

    // 4. Compute Stats
    self.postMessage({ type: "progress", message: "Computing statistics...", progress: 10 });
    const stats = calculateSbomStats(bom);
    if (import.meta.env.DEV) console.log(`[Worker] Stats computed`);

    // 5. Format
    self.postMessage({ type: "progress", message: "Building dependency tree...", progress: 20 });
    const formatted = await Formatter({
      rawSBOM: bom,
      setProgress: (update) => {
        const val = typeof update === 'function' ? update({ progress: 0, message: '' }) : update;
        // Map 0-100 progress from Formatter to 20-95 worker progress
        const workerProgress = 20 + (val.progress * 0.75);
        self.postMessage({ type: "progress", message: val.message, progress: workerProgress });
      }
    });
    if (import.meta.env.DEV) console.log(`[Worker] Tree formatted`);

    // 6. Serialize and Send
    self.postMessage({ type: "progress", message: "Finalizing...", progress: 95 });
    
    // Convert to plain objects to ensure compatibility with all browsers' structured clone
    // We wrapped them in a 'result' object as expected by App.tsx
    const plainBom = deepToPlain(bom);
    const plainStats = deepToPlain(stats);
    const plainFormatted = deepToPlain(formatted);

    self.postMessage({
      type: "complete",
      result: {
        bom: plainBom,
        stats: plainStats,
        formatted: plainFormatted,
      }
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurring during background processing";
    console.error(`[Worker] Error processing SBOM:`, error);
    self.postMessage({
      type: "error",
      message,
    });
  }
};

/**
 * Recursively converts class instances (like CycloneDX models) to plain objects.
 * This ensures the data can be reliably sent via postMessage in all environments.
 *
 * NOTE: We intentionally do NOT use a global "seen" set for cycle detection,
 * because the stats object contains shared references (e.g. vulnerableComponents
 * shares elements with allVulnerableComponents). A global "seen" set would
 * incorrectly treat these shared references as circular and return undefined.
 * Instead, we track ancestors on the current recursion path only.
 */
function deepToPlain(obj: any, ancestors = new WeakSet()): any {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  // Only detect actual cycles (same object on the current recursion path)
  if (ancestors.has(obj)) {
    return undefined;
  }

  // Handle Sets — convert to arrays before recursing
  if (obj instanceof Set) {
    const arr = Array.from(obj);
    ancestors.add(obj);
    const result = arr.map(v => deepToPlain(v, ancestors));
    ancestors.delete(obj);
    return result;
  }

  // Handle Maps — convert to plain objects
  if (obj instanceof Map) {
    ancestors.add(obj);
    const plainMap: any = {};
    for (const [key, value] of obj) {
      plainMap[key] = deepToPlain(value, ancestors);
    }
    ancestors.delete(obj);
    return plainMap;
  }

  // Handle Arrays
  if (Array.isArray(obj)) {
    ancestors.add(obj);
    const result = obj.map(v => deepToPlain(v, ancestors));
    ancestors.delete(obj);
    return result;
  }

  // Track this object as an ancestor for child recursion
  ancestors.add(obj);

  // Special handling for BomRef and similar classes with a 'value' property
  if (obj.value !== undefined && Object.keys(obj).length <= 2) {
    ancestors.delete(obj);
    return { value: obj.value };
  }

  // Handle plain objects and class instances
  const plain: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && typeof obj[key] !== 'function') {
      plain[key] = deepToPlain(obj[key], ancestors);
    }
  }

  ancestors.delete(obj);
  return plain;
}
