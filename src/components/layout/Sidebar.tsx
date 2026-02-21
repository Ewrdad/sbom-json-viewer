import { useView } from "../../context/ViewContext";
import type { ViewType } from "../../types";
import { LayoutDashboard, List, Network, ShieldAlert, ScrollText, Info, GitGraph, Wrench } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

export function Sidebar() {
  // console.log("Sidebar component rendering...");
  const { activeView, setActiveView } = useView();

  const navItems: { id: ViewType; label: string; icon: React.ReactNode; description: string }[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4 mr-2" />,
      description: "Overview of SBOM metrics and health",
    },
    {
      id: "vulnerabilities",
      label: "Vulnerabilities",
      icon: <ShieldAlert className="h-4 w-4 mr-2" />,
      description: "Security vulnerabilities found in components",
    },
    {
      id: "licenses",
      label: "Licenses",
      icon: <ScrollText className="h-4 w-4 mr-2" />,
      description: "License usage and compliance oversight",
    },
    {
      id: "explorer",
      label: "Components",
      icon: <List className="h-4 w-4 mr-2" />,
      description: "Detailed list of all software components",
    },
    {
      id: "tree",
      label: "Dependency Tree",
      icon: <Network className="h-4 w-4 mr-2 rotate-90" />,
      description: "Hierarchical view of component dependencies",
    },
    {
      id: "graph",
      label: "Visual Graph",
      icon: <Network className="h-4 w-4 mr-2" />,
      description: "Interactive graph visualization of dependencies",
    },
    {
      id: "reverse-tree",
      label: "Reverse Tree",
      icon: <GitGraph className="h-4 w-4 mr-2" />,
      description: "Trace dependencies from leaf to root",
    },
    {
      id: "metadata",
      label: "Metadata",
      icon: <Info className="h-4 w-4 mr-2" />,
      description: "Metadata about the SBOM file itself",
    },
    {
      id: "developer",
      label: "Developer Insights",
      icon: <Wrench className="h-4 w-4 mr-2" />,
      description: "Package hygiene, version conflicts, and metadata quality",
    },
  ];

  return (
    <div className="w-64 border-r bg-card flex flex-col h-screen">
      <div className="p-4 border-b">
        <h1 className="font-bold text-lg flex items-center gap-2">
          <span>📦</span> SBOM Viewer
        </h1>
      </div>
      <TooltipProvider>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={activeView === item.id ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    activeView === item.id ? "" : "text-muted-foreground",
                  )}
                  onClick={() => setActiveView(item.id)}
                >
                  {item.icon}
                  {item.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{item.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>
      </TooltipProvider>
      <div className="p-4 border-t text-xs text-muted-foreground">
        v0.2.0 (Revamped)
      </div>
    </div>
  );
}
