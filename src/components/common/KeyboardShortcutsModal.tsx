import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Command, Keyboard } from "lucide-react";

export function KeyboardShortcutsModal() {
  const shortcuts = [
    { name: "Global Search", keys: ["Ctrl", "K"], icon: <Command className="h-3 w-3" /> },
    { name: "Switch to Dashboard", keys: ["Alt", "1"] },
    { name: "Switch to Vulnerabilities", keys: ["Alt", "2"] },
    { name: "Switch to Supply Chain Risk", keys: ["Alt", "3"] },
    { name: "Switch to Licenses", keys: ["Alt", "4"] },
    { name: "Switch to Components", keys: ["Alt", "5"] },
    { name: "Switch to Dependency Tree", keys: ["Alt", "6"] },
    { name: "Switch to Visual Graph", keys: ["Alt", "7"] },
    { name: "Switch to Reverse Tree", keys: ["Alt", "8"] },
    { name: "Switch to Metadata", keys: ["Alt", "9"] },
    { name: "Close Panels / Modals", keys: ["Esc"] },
  ];

  return (
    <Dialog>
      <DialogTrigger>
        <div className="inline-block p-2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" title="Keyboard Shortcuts">
          <Keyboard className="h-5 w-5" />
          <span className="sr-only">Keyboard Shortcuts</span>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 mt-4">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-transparent hover:border-primary/20 transition-colors">
              <span className="text-sm font-medium flex items-center gap-2">
                {s.icon}
                {s.name}
              </span>
              <div className="flex gap-1">
                {s.keys.map((k, ki) => (
                  <kbd key={ki} className="min-w-[2rem] h-6 px-1.5 flex items-center justify-center bg-background border rounded text-[10px] font-mono font-bold shadow-sm">
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-4 italic">
          Tip: Use these shortcuts to navigate lightning-fast between views.
        </p>
      </DialogContent>
    </Dialog>
  );
}
