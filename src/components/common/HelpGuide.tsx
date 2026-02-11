import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, FileText, Upload, Shield } from "lucide-react";

export function HelpGuide() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <HelpCircle className="h-5 w-5" />
            <span className="sr-only">Help Guide</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>SBOM Viewer Guide</DialogTitle>
          <DialogDescription>
            Learn how to generate, import, and analyze your Software Bill of Materials.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              1. Generate an SBOM
            </h3>
            <p className="text-sm text-muted-foreground">
              This viewer supports CycloneDX JSON format. You can generate an SBOM using tools like <a href="https://trivy.dev/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Trivy</a> or <a href="https://github.com/anchore/syft" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Syft</a>.
            </p>
            <div className="bg-muted p-3 rounded-md font-mono text-sm overflow-x-auto">
              trivy fs . --format cyclonedx --output sbom.json
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              2. Import SBOM
            </h3>
            <p className="text-sm text-muted-foreground">
              Click the <strong>Upload SBOM</strong> button in the top right to load your generated <code>.json</code> file. You can also explore the sample datasets provided.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              3. Analyze Vulnerabilities
            </h3>
            <p className="text-sm text-muted-foreground">
              Navigate to the <strong>Vulnerabilities</strong> view to see security risks. 
              The <strong>Tree</strong> view helps visualize how deep dependencies are introduced into your project.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
