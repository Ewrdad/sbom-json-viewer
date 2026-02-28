import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import React, { Suspense } from "react";
import { Button } from "@/components/ui/button";

const Mermaid = React.lazy(() => import("@/components/ui/mermaid").then(module => ({ default: module.Mermaid })));
import { HelpCircle, FileText, Info, CheckCircle, Lightbulb, ShieldCheck, Command } from "lucide-react";

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
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>SBOM Viewer Guide</DialogTitle>
          <DialogDescription>
            Learn about Software Bill of Materials (SBOM) and how to make the most of this viewer.
          </DialogDescription>
        </DialogHeader>
        
        <Accordion multiple defaultValue={["getting-started"]} className="w-full mt-4 space-y-2">
          <AccordionItem value="what-is-sbom" className="border rounded-lg px-4 bg-card shadow-sm overflow-hidden">
            <AccordionTrigger className="hover:no-underline py-4">
              <span className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                What is an SBOM?
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4 pt-2">
              <p>
                A <strong>Software Bill of Materials (SBOM)</strong> is essentially a "nutrition label" for software. It is a formal, machine-readable inventory detailing all the components, libraries, and dependencies that make up a software application.
              </p>
              <p>
                SBOMs typically include the component name, version, supplier, dependency relationship, and sometimes licensing and known vulnerability information. The primary formats used in the industry are <strong>CycloneDX</strong> (used heavily in this tool) and <strong>SPDX</strong>.
              </p>
              <div className="my-4 rounded-md border bg-muted/20 h-48 overflow-hidden">
                <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">Loading chart...</div>}>
                  <Mermaid chart={`
                    flowchart LR
                      Code[Source Code] --> Build[Build Process]
                      Build --> App[Application]
                      Build -.-> SBOM[SBOM Metadata]
                      App --- SBOM
                      style App fill:#3b82f6,color:#fff
                      style SBOM fill:#10b981,color:#fff
                  `} />
                </Suspense>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="getting-started" className="border rounded-lg px-4 bg-card shadow-sm overflow-hidden">
            <AccordionTrigger className="hover:no-underline py-4">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Getting Started
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-6 pt-2">
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  1. Generate an SBOM
                </h4>
                <p className="text-sm text-muted-foreground">
                  This viewer supports CycloneDX JSON format. You can generate an SBOM using tools like <a href="https://trivy.dev/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Trivy</a> or <a href="https://github.com/anchore/syft" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Syft</a>.
                </p>
                <div className="bg-muted p-3 rounded-md font-mono text-sm overflow-x-auto whitespace-pre">
                  trivy fs . --format cyclonedx --output sbom.json
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  2. Import SBOM
                </h4>
                <p className="text-sm text-muted-foreground">
                  Click the <strong>Upload SBOM</strong> button to load your generated <code>.json</code> file, or use one of the provided sample datasets to explore features immediately.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  3. Analyze Risks
                </h4>
                <p className="text-sm text-muted-foreground">
                  Navigate to the <strong>Vulnerabilities</strong> or <strong>Components</strong> views to analyze your application's security posture and dependency tree.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="best-practices" className="border rounded-lg px-4 bg-card shadow-sm overflow-hidden">
            <AccordionTrigger className="hover:no-underline py-4">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                Best Practices
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4 pt-2">
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Generate at build time:</strong> Integrate SBOM generation natively into your CI/CD pipeline so every artifact produced has an associated SBOM.</li>
                <li><strong>Store securely:</strong> Treat your SBOMs as sensitive metadata and store them alongside your artifacts in a secure registry.</li>
                <li><strong>Keep it updated:</strong> Applications change; so should your SBOMs. Regenerate them dynamically as dependencies shift.</li>
                <li><strong>Include vulnerability data:</strong> Use tools that map SBOM components to CVE databases (like VEX data) for immediate, actionable security insights.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="making-the-most" className="border rounded-lg px-4 bg-card shadow-sm overflow-hidden">
            <AccordionTrigger className="hover:no-underline py-4">
              <span className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                Making the Most of SBOMs
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4 pt-2">
              <p>
                Having an SBOM is just the first step. To extract maximum value:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Continuous Vulnerability Monitoring:</strong> Map your SBOMs continuously against new CVEs. A component safe today might be vulnerable tomorrow.</li>
                <li><strong>Supply Chain Verification:</strong> Use digital signatures to verify that your SBOM hasn't been tampered with and that the components match the metadata.</li>
                <li><strong>License Compliance:</strong> Audit your dependency tree for copyleft licenses or conflicting terms that might impact your business objectives.</li>
                <li><strong>Dependency Reduction:</strong> Identify bloated, unused, or highly conflicted packages and remove or consolidate them to reduce your attack surface.</li>
              </ul>
              <div className="mt-4 rounded-md border bg-muted/20 h-64 overflow-hidden">
                <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">Loading chart...</div>}>
                  <Mermaid chart={`
                    flowchart TD
                      SBOM[SBOM Data] --> Vuln[Vulnerability Scanning]
                      SBOM --> License[License Compliance]
                      SBOM --> Insights[Architecture Insights]
                      Vuln --> Alerts[Security Alerts]
                      License --> Audit[Audit Reports]
                      Insights --> Debt[Tech Debt Reduction]
                      style SBOM fill:#8b5cf6,color:#fff
                  `} />
                </Suspense>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="privacy-security" className="border rounded-lg px-4 bg-card shadow-sm overflow-hidden">
            <AccordionTrigger className="hover:no-underline py-4">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Privacy & Provable Security
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4 pt-2">
              <p className="font-semibold text-green-700 dark:text-green-400">Your data never leaves your browser.</p>
              <p className="text-sm text-muted-foreground">
                This application is designed with a "local-first" privacy model. All processing, parsing, and analysis are performed entirely by your browser's JavaScript engine (Web Workers).
              </p>
              <ul className="list-disc pl-5 text-sm space-y-2 text-muted-foreground">
                <li><strong>No Server Uploads:</strong> No SBOM content is ever uploaded to our servers.</li>
                <li><strong>Session-Only:</strong> Refreshing or closing this tab permanently clears all processed data from memory.</li>
                <li><strong>No Local Storage:</strong> SBOM data is never saved to disk or persistent storage.</li>
              </ul>

              <div className="bg-muted/50 p-4 rounded-lg border border-primary/10">
                <h4 className="text-xs font-bold uppercase mb-2 flex items-center gap-2">
                   <CheckCircle className="h-3 w-3" /> Privacy Verification (3-Step Guide)
                </h4>
                <p className="text-[10px] text-muted-foreground mb-3">Technical users can verify our privacy claims in seconds:</p>
                <ol className="list-decimal pl-4 text-xs space-y-2 text-muted-foreground">
                  <li>Open Browser DevTools (<code>F12</code> or <code>Ctrl+Shift+I</code>).</li>
                  <li>Go to the <strong>Network</strong> tab and click the "XHR/Fetch" filter.</li>
                  <li>Upload a local SBOM. You will see <strong>zero</strong> network requests leaving the browser during processing.</li>
                </ol>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="shortcuts" className="border rounded-lg px-4 bg-card shadow-sm overflow-hidden">
            <AccordionTrigger className="hover:no-underline py-4">
              <span className="flex items-center gap-2">
                <Command className="h-4 w-4 text-primary" />
                Keyboard Shortcuts
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4 pt-2 text-sm text-muted-foreground">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <span>Global Search</span>
                  <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono font-bold">Cmd/Ctrl + K</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <span>Navigate Views</span>
                  <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono font-bold">Alt + 1-9</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <span>Close Detail Panels</span>
                  <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono font-bold">Esc</kbd>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="transparency" className="border rounded-lg px-4 bg-card shadow-sm overflow-hidden">
            <AccordionTrigger className="hover:no-underline py-4">
              <span className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                Transparency & Methodology
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4 pt-2">
              <div className="space-y-4">
                <section>
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" /> Multi-SBOM Merging
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    When merging multiple SBOMs, we use a <strong>"First-Wins"</strong> strategy for component metadata. If a component exists in both, License, Version, and Description are taken from the first source encountered. Vulnerabilities and Licenses from all sources are unioned.
                  </p>
                </section>

                <section>
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" /> Deduplication Policy
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Primary deduplication requires an <strong>Exact PURL match</strong>. If PURLs are missing, the system falls back to matching by <strong>Name + Version</strong>. Inconsistent naming across tools may lead to duplicate entries if PURLs are absent.
                  </p>
                </section>

                <section>
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" /> Severity Attribution
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    The "Top Severity" shown is the <strong>worst-case</strong> (highest) rating found across all providers (NVD, GitHub, Vendor) within the SBOM. The detail panel identifies which source provided that specific rating.
                  </p>
                </section>

                <section>
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" /> Dependency Root Detection
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Direct vs Transitive statistics rely on identifying a "Root" component in the metadata. If missing, the application makes a best guess based on the dependency graph. Results for fragmented SBOMs may vary.
                  </p>
                </section>

                <section>
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" /> CWE Chart Inflation
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    One vulnerability may map to multiple CWE categories. Therefore, the sum of all CWE counts in charts may exceed the total number of unique vulnerabilities.
                  </p>
                </section>

                <section>
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" /> VEX-Enriched SBOM Export
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Local Vulnerability Exploitability eXchange (VEX) assessments are injected directly into the exported CycloneDX file. Status and justifications are mapped to the vulnerability's <code>analysis.state</code> and <code>analysis.detail</code> fields, alongside custom <code>properties</code> (e.g., <code>vex:status</code>, <code>vex:justification</code>) to ensure data portability.
                  </p>
                </section>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </DialogContent>
    </Dialog>
  );
}
