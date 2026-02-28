import { convertJsonToBom } from "../lib/bomConverter";
import { Formatter } from "../renderer/Formatter/Formatter";
import { calculateSbomStats } from "../lib/statsUtils";
import { calculateDependents, calculateTransitiveDependents } from "../lib/dependencyUtils";
import { deepToPlain } from "../lib/cloneUtils";
import { mergeSBOMs } from "../lib/sbomMerger";

/**
 * SBOM Worker
 * Handles heavy lifting: JSON parsing, SBOM conversion, formatting, stats, and multi-file merging.
 */

self.onmessage = async (e: MessageEvent) => {
  const { jsonText, url, file, files, filename: providedFilename } = e.data;
  
  let primaryName = "SBOM";
  if (providedFilename) primaryName = providedFilename;
  else if (files && files.length > 0) primaryName = `Merged: ${files.map((f: File) => f.name).join(", ")}`;
  else if (file) primaryName = file.name;
  else if (url) primaryName = url.split('/').pop() || 'SBOM';

  const filename = primaryName;

  const logs: string[] = [];
  const addLog = (msg: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('Z')[0];
    logs.push(`[${timestamp}] ${msg}`);
  };

  try {
    addLog(`Starting processing for ${filename}`);
    let finalJsonTexts: string[] = [];

    const sourceNames: string[] = [];

    // 1. Get JSON Text(s)
    if (files && files.length > 0) {
      addLog(`Reading ${files.length} local files`);
      self.postMessage({ type: "progress", message: `Reading ${files.length} files...`, progress: 0 });
      let loaded = 0;
      const totalSize = files.reduce((acc: number, f: File) => acc + f.size, 0);
      
      for (const f of files) {
        addLog(`Processing file: ${f.name} (${f.size} bytes)`);
        const reader = f.stream().getReader();
        const chunks: Uint8Array[] = [];
        let fileLoaded = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.length;
          fileLoaded += value.length;
          self.postMessage({ type: "progress", message: `Reading files...`, progress: (loaded / totalSize) * 100 });
        }
        
        const fileBytes = new Uint8Array(fileLoaded);
        let offset = 0;
        for (const chunk of chunks) {
          fileBytes.set(chunk, offset);
          offset += chunk.length;
        }
        finalJsonTexts.push(new TextDecoder().decode(fileBytes));
        sourceNames.push(f.name);
      }
    } else if (url) {
      addLog(`Downloading SBOM from remote URL: ${url}`);
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
        finalJsonTexts.push(new TextDecoder().decode(combined));
      } else {
        finalJsonTexts.push(await response.text());
      }
      addLog(`Remote download complete (${finalJsonTexts[0].length} bytes)`);
    } else if (file) {
      addLog(`Reading local file: ${file.name} (${file.size} bytes)`);
      self.postMessage({ type: "progress", message: `Reading ${filename}...`, progress: 0 });
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
      finalJsonTexts.push(new TextDecoder().decode(combined));
      addLog(`Local file read complete`);
    } else if (jsonText) {
      addLog(`Processing direct JSON text input (${jsonText.length} bytes)`);
      finalJsonTexts.push(jsonText);
    }

    if (finalJsonTexts.length === 0) throw new Error("No SBOM data provided or found");

    // 2. Parse and Merge JSONs
    addLog(`Parsing ${finalJsonTexts.length} JSON strings`);
    self.postMessage({ type: "progress", message: `Parsing JSON...`, progress: 0 });
    const jsons = finalJsonTexts.map(text => JSON.parse(text));
    finalJsonTexts = []; // GC

    self.postMessage({ type: "progress", message: `Merging data (if multiple)...`, progress: 2 });
    const mergedJson = mergeSBOMs(jsons, sourceNames.length > 0 ? sourceNames : undefined);
    if (!mergedJson) throw new Error("Merged JSON is null or undefined");
    
    if (jsons.length > 1) {
      const stats = (mergedJson as any).__multiSbomStats;
      addLog(`Multi-SBOM Merge: Combined ${jsons.length} sources into ${stats?.overlap?.components?.total || 'unknown'} unique components`);
    } else {
      addLog(`JSON parse successful`);
    }


    // 3. Convert to Bom
    addLog(`Converting JSON to CycloneDX object model`);
    self.postMessage({ type: "progress", message: "Converting to CycloneDX model...", progress: 5 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bom = await convertJsonToBom(mergedJson as any);
    addLog(`Model conversion complete: ${bom.components.size} components, ${bom.vulnerabilities.size} vulnerabilities`);

    if ((bom as any)._parsingWarnings?.length > 0) {
      addLog(`Detected ${(bom as any)._parsingWarnings.length} parsing warnings during conversion`);
    }

    // 4. Compute Stats
    addLog(`Calculating security and metadata statistics`);
    self.postMessage({ type: "progress", message: "Computing statistics...", progress: 10 });
    const stats = calculateSbomStats(bom);
    addLog(`Statistics complete. Overall Grade: ${stats.developerStats?.metadataQuality?.grade || 'N/A'} (${stats.developerStats?.metadataQuality?.score || 0} pts)`);
    
    // Attach multiSbomStats if present
    if ((mergedJson as Record<string, unknown>).__multiSbomStats) {
      // @ts-expect-error - overriding calculated stats with our multi-sbom metrics
      stats.multiSbomStats = (mergedJson as Record<string, unknown>).__multiSbomStats;
    }


    // 5. Format
    addLog(`Building dependency graphs and formatting for UI`);
    self.postMessage({ type: "progress", message: "Building dependency tree...", progress: 20 });
    const formatted = await Formatter({
      rawSBOM: bom,
      setProgress: (update) => {
        const val = typeof update === 'function' ? update({ progress: 0, message: '' }) : update;
        const workerProgress = 20 + (val.progress * 0.75);
        self.postMessage({ type: "progress", message: val.message, progress: workerProgress });
      }
    });


    // Add signature to formatted object if it exists on bom
    const signature = ((bom as unknown) as { signature?: unknown }).signature;
    if (signature) {
      formatted.signature = signature as Exclude<typeof formatted.signature, undefined>; 
    }

    // 5b. Calculate Reverse Dependency Graph
    addLog(`Calculating reverse dependency map and blast radius`);
    if (formatted.dependencyGraph) {
        formatted.dependentsGraph = calculateDependents(formatted.dependencyGraph);
        formatted.blastRadius = calculateTransitiveDependents(formatted.dependentsGraph);
    } else {
        formatted.dependentsGraph = new Map();
        formatted.blastRadius = new Map();
    }

    // 6. Serialize and Send
    addLog(`Serializing data for main thread transmission`);
    self.postMessage({ type: "progress", message: "Finalizing...", progress: 95 });
    
    const plainBom = deepToPlain(bom);
    const plainStats = deepToPlain(stats);
    const plainFormatted = deepToPlain(formatted);

    addLog(`Processing complete. Sending results.`);
    self.postMessage({
      type: "complete",
      result: {
        bom: plainBom,
        stats: plainStats,
        formatted: plainFormatted,
        logs,
      }
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurring during background processing";
    addLog(`ERROR: ${message}`);
    console.error(`[Worker] Error processing SBOM:`, error);
    self.postMessage({
      type: "error",
      message,
      logs,
    });
  }
};
