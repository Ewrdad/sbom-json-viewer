import { CheckCircle2, XCircle, Info, ChevronRight, ListTodo, ArrowUpCircle } from "lucide-react";
import type { MetadataQuality } from "@/types/sbom";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function MetadataQualityCard({ quality }: { quality: MetadataQuality }) {
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);
  const metadataChecks = [
    { key: 'versions', label: 'Component Versions', description: 'Exact versions of components', guidance: 'Ensure lockfiles (package-lock.json, poetry.lock) are present before scanning.', weight: 20 },
    { key: 'licenses', label: 'License Metadata', description: 'Legal compliance and usage rights', guidance: 'Use `syft <dir> -o cyclonedx-json` or ensure `FETCH_LICENSE=true` with cdxgen.', weight: 15 },
    { key: 'purl', label: 'Package URLs (PURLs)', description: 'Universal identifiers for components', guidance: 'Use established scanners like Trivy or Syft which generate PURLs by default.', weight: 15 },
    { key: 'dependencies', label: 'Dependency Graph', description: 'Relationship links between components', guidance: 'Use `cdxgen -r .` or `syft <dir> -o cyclonedx-json` to capture the full dependency tree.', weight: 10 },
    { key: 'hashes', label: 'Cryptographic Hashes', description: 'Ensures file integrity and safety', guidance: 'For deeper file hashing, use `syft <dir> --catalogers file-cataloger`.', weight: 10 },
    { key: 'supplier', label: 'Supplier/Author Info', description: 'Origin and maintenance tracking', guidance: 'Requires deep registry fetching. E.g., `export FETCH_LICENSE=true; cdxgen -r .`', weight: 10 },
    { key: 'timestamp', label: 'Creation Timestamp', description: 'When the SBOM was generated', guidance: 'Included by default in most modern SBOM tools.', weight: 5 },
    { key: 'tools', label: 'Creator Tools', description: 'Tracks the tool that generated this SBOM', guidance: 'Standard in CycloneDX. Ensure your scanner populates the `metadata.tools` node.', weight: 5 },
    { key: 'types', label: 'Component Types', description: 'Categorizes components (library, application, etc)', guidance: 'Required by the CycloneDX spec. Helps filter types of risks.', weight: 5 },
    { key: 'properties', label: 'Extended Properties', description: 'Tool-specific enriched metadata', guidance: 'Custom extensions (key/value). Often used by Trivy or cdxgen for configuration flags.', weight: 5 },
  ];

  const failedChecks = metadataChecks.filter(check => !quality.checks[check.key as keyof typeof quality.checks]);

  return (
    <div className="space-y-6">
      {/* Action Items for Grade Improvement */}
      {failedChecks.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50 rounded-xl p-4 animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-2 mb-3 text-amber-800 dark:text-amber-400">
            <ListTodo className="h-5 w-5" />
            <h4 className="font-bold text-sm uppercase tracking-tight">Improvement Actions</h4>
          </div>
          <div className="space-y-2">
            {failedChecks.slice(0, 3).map((check) => (
              <div key={check.key} className="flex items-start gap-3 text-xs">
                <ArrowUpCircle className="h-3.5 w-3.5 mt-0.5 text-amber-600 flex-none" />
                <div>
                  <span className="font-bold text-amber-900 dark:text-amber-300">Boost {check.label}:</span>
                  <span className="ml-1 text-amber-800/80 dark:text-amber-400/80">{check.guidance}</span>
                </div>
              </div>
            ))}
            {failedChecks.length > 3 && (
              <p className="text-[10px] text-amber-600 italic pl-6 pt-1">
                + {failedChecks.length - 3} more recommended optimizations
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {metadataChecks.map((check) => {
          const isPassed = quality.checks[check.key as keyof typeof quality.checks];
          return (
            <div key={check.key} className="flex gap-4 p-3 rounded-lg border bg-background/50 relative overflow-hidden group">
              <div className={`flex-none mt-1 ${isPassed ? 'text-green-500' : 'text-slate-300'}`}>
                {isPassed ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              </div>
              <div className="space-y-1 relative z-10 w-full pr-2">
                <div className="flex items-center gap-2">
                  <h5 className="font-semibold text-sm">{check.label}</h5>
                  <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 border rounded-full">
                    {check.weight} pts
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{check.description}</p>
                
                <div className="flex items-start gap-1.5 mt-2 bg-blue-50/50 p-2 rounded text-xs text-blue-800/80 dark:bg-blue-900/10 dark:text-blue-300">
                  <Info className="h-3.5 w-3.5 mt-0.5 flex-none" />
                  <span>{check.guidance}</span>
                </div>
              </div>
              <div 
                className={`absolute left-0 top-0 bottom-0 w-1 transition-all group-hover:w-1.5 ${
                  isPassed ? 'bg-green-500' : 'bg-slate-200'
                }`} 
              />
            </div>
          );
        })}
      </div>

      <Collapsible
        open={isMethodologyOpen}
        onOpenChange={setIsMethodologyOpen}
        className="rounded-lg bg-blue-50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/50"
      >
        <CollapsibleTrigger className="w-full p-4 flex items-center justify-between text-blue-800 dark:text-blue-300 hover:opacity-80 transition-opacity bg-transparent border-none">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 flex-none" />
            <span className="text-sm font-bold">Scoring Methodology</span>
          </div>
          <ChevronRight className={`h-4 w-4 transition-transform ${isMethodologyOpen ? 'rotate-90' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-12 pb-4 text-blue-800/90 dark:text-blue-300/90">
          <div className="text-xs space-y-3">
            <p>
              Metadata quality is calculated based on the saturation of key fields across all components:
            </p>
            <ul className="list-disc space-y-1.5 opacity-80">
              <li><strong>Essential Fields:</strong> Versions, Licenses, PURLs, Types, and Dependencies require <strong>&gt;50%</strong> saturation to pass.</li>
              <li><strong>Enriched Fields:</strong> Hashes, Suppliers, and Properties require <strong>&gt;10%</strong> saturation, as these are often only present in specific ecosystems or advanced scans.</li>
              <li><strong>BOM-Level Fields:</strong> Timestamps and Creator Tools are checked once for the entire file.</li>
            </ul>
            <div className="pt-2 border-t border-blue-200 dark:border-blue-800 flex justify-between items-center font-semibold">
              <span>Grades:</span>
              <div className="flex gap-3">
                <span>A: 70+</span>
                <span>B: 55-69</span>
                <span>C: 40-54</span>
                <span>D: &lt;40</span>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
