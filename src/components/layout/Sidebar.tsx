import { useView } from "../../context/ViewContext";
import type { ViewType } from "../../types";
import { LayoutDashboard, List, Network, ShieldAlert } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

export function Sidebar() {
  // console.log("Sidebar component rendering...");
  const { activeView, setActiveView } = useView();

  const navItems: { id: ViewType; label: string; icon: React.ReactNode }[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4 mr-2" />,
    },
    {
      id: "vulnerabilities",
      label: "Vulnerabilities",
      icon: <ShieldAlert className="h-4 w-4 mr-2" />,
    },
    {
      id: "explorer",
      label: "Components",
      icon: <List className="h-4 w-4 mr-2" />,
    },
    {
      id: "tree",
      label: "Dependency Tree",
      icon: <Network className="h-4 w-4 mr-2 rotate-90" />,
    },
    {
      id: "graph",
      label: "Visual Graph",
      icon: <Network className="h-4 w-4 mr-2" />,
    },
  ];

  return (
    <div className="w-64 border-r bg-card flex flex-col h-screen">
      <div className="p-4 border-b">
        <h1 className="font-bold text-lg flex items-center gap-2">
          <span>📦</span> SBOM Viewer
        </h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Button
            key={item.id}
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
        ))}
      </nav>
      <div className="p-4 border-t text-xs text-muted-foreground">
        v0.2.0 (Revamped)
      </div>
    </div>
  );
}
