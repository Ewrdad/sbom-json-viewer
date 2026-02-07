import { useEffect, useState } from "react";
import { Renderer } from "./renderer/renderer";
import { convertJsonToBom } from "./lib/bomConverter";
import { Button } from "@/components/ui/button";

export function App() {
  const [sbom, setSbom] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<string>(
    "sample-simple.cyclonedx.json",
  );

  const loadSBOM = (filename: string) => {
    setSbom(null);
    setError(null);

    fetch(`/${filename}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load SBOM: ${filename}`);
        }
        return response.json();
      })
      .then((data) => {
        // Convert raw JSON to Bom object
        const bom = convertJsonToBom(data);
        setSbom(bom);
      })
      .catch((err) => {
        setError(err.message);
        console.error("Error loading SBOM:", err);
      });
  };

  useEffect(() => {
    loadSBOM(currentFile);
  }, [currentFile]);

  if (error) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          Error Loading SBOM
        </h1>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => loadSBOM(currentFile)}>Retry</Button>
      </div>
    );
  }

  if (!sbom) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Loading SBOM...</h1>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <header className="border-b sticky top-0 bg-background/90 backdrop-blur z-10">
        <div className="container mx-auto py-4 px-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-sm" />
                <h1 className="text-3xl font-bold">SBOM Viewer</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                CycloneDX Software Bill of Materials Viewer
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={
                  currentFile === "sample-simple.cyclonedx.json"
                    ? "default"
                    : "outline"
                }
                size="sm"
                onClick={() => setCurrentFile("sample-simple.cyclonedx.json")}
              >
                Simple Sample
              </Button>
              <Button
                variant={
                  currentFile === "sbom.cyclonedx.json" ? "default" : "outline"
                }
                size="sm"
                onClick={() => setCurrentFile("sbom.cyclonedx.json")}
              >
                Full SBOM
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Active file:</span>
            <span className="rounded-full border px-2 py-0.5">
              {currentFile}
            </span>
          </div>
        </div>
      </header>
      <main className="container mx-auto pb-16">
        <Renderer SBOM={sbom} />
      </main>
    </div>
  );
}

export default App;
