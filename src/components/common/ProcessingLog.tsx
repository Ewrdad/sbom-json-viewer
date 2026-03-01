import { Terminal, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ProcessingLog({ logs }: { logs: string[] }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger className="inline-flex items-center gap-1.5 px-2 md:px-3 h-8 rounded-md text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors" title="Processing Log">
        <Terminal className="h-3 w-3" />
        <span className="hidden md:inline">Processing Log</span>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Background Processing Log
          </DialogTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs mr-6"
            onClick={handleCopy}
            disabled={logs.length === 0}
          >
            {copied ? (
              <Check className="h-3 w-3 mr-1.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5 mr-1.5" />
            )}
            {copied ? "Copied" : "Copy Logs"}
          </Button>
          </DialogHeader>

          {/* Sovereignty Banner */}
          <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-md flex items-start gap-3">
          <div className="bg-primary/20 p-1.5 rounded-full mt-0.5">
            <Check className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Data Sovereignty Verified</h4>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
              All analysis is performed <span className="text-foreground font-medium">100% locally</span> in your browser. Your SBOM data never leaves your machine.
            </p>
          </div>
          </div>

          <div className="mt-4 flex-1 overflow-hidden rounded-md border bg-slate-950 p-4 font-mono text-xs text-slate-200">
          <ScrollArea className="h-[50vh]">
            {logs.length > 0 ? (
              <div className="space-y-1">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-slate-500 flex-none select-none">
                      {(i + 1).toString().padStart(2, "0")}
                    </span>
                    <span className="break-all">{log}</span>
                  </div>
                ))}
                <div className="animate-pulse inline-block h-3 w-1 bg-slate-400 ml-1" />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 italic">
                Waiting for processing to start...
              </div>
            )}
          </ScrollArea>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground italic">
          Why this exists: This log shows every step the Background Web Worker took to process your SBOM locally in your browser, ensuring complete transparency.
        </p>
      </DialogContent>
    </Dialog>
  );
}
