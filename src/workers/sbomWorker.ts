import { convertJsonToBom } from "../lib/bomConverter";
import { Formatter } from "../renderer/Formatter/Formatter";
import { calculateSbomStats } from "../lib/statsUtils";
import { calculateDependents, calculateTransitiveDependents } from "../lib/dependencyUtils";
import { deepToPlain } from "../lib/cloneUtils";

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

    // Add signature to formatted object if it exists on bom
    if ((bom as any).signature) {
      formatted.signature = (bom as any).signature;
    }

    // 5b. Calculate Reverse Dependency Graph
    // Formatter returns dependencyGraph as a Map
    if (formatted.dependencyGraph) {
        formatted.dependentsGraph = calculateDependents(formatted.dependencyGraph);
        formatted.blastRadius = calculateTransitiveDependents(formatted.dependentsGraph);
    } else {
        formatted.dependentsGraph = new Map();
        formatted.blastRadius = new Map();
    }

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


