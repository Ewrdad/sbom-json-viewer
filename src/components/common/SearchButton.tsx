import { Search, ChevronDown, Settings, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSettings, SEARCH_ENGINES, type SearchEngineId } from "../../context/SettingsContext";

interface SearchButtonProps {
  query: string;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon" | "xs";
}

export function SearchButton({ query, className, size = "sm" }: SearchButtonProps) {
  const { defaultSearchEngine, setDefaultSearchEngine, performSearch } = useSettings();
  
  const currentEngine = SEARCH_ENGINES.find(e => e.id === defaultSearchEngine) || SEARCH_ENGINES[0];

  const handleSearch = () => {
    performSearch(query);
  };

  const handleSpecificSearch = (engineId: SearchEngineId) => {
    performSearch(query, engineId);
  };

  return (
    <div className={`flex items-center gap-0 bg-secondary/50 rounded-md border shadow-sm ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={size}
              className="rounded-r-none hover:bg-secondary border-r h-8 px-3 gap-2"
              onClick={handleSearch}
            >
              <Search className="h-4 w-4" />
              <span className="sr-only">Search</span>
              <span className="truncate max-w-[100px] text-xs font-normal hidden sm:inline-block">
                Search on {currentEngine.name}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[300px] text-xs">
            Click to search for <span className="font-mono font-bold">"{query}"</span> on {currentEngine.name}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenu>
        <DropdownMenuTrigger 
          className={cn(
            "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
            "ghost hover:bg-secondary text-secondary-foreground",
            "rounded-l-none h-8 w-6 px-0",
            "focus:outline-none"
          )}
        >
          <ChevronDown className="h-3 w-3 opacity-50" />
          <span className="sr-only">More options</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs">Quick Search (One-off)</DropdownMenuLabel>
            {SEARCH_ENGINES.map((engine) => (
               <DropdownMenuItem 
                 key={engine.id} 
                 onClick={() => handleSpecificSearch(engine.id)}
                 className="text-xs flex items-center justify-between"
               >
                 <span className="flex items-center gap-2">
                   {engine.isAi && <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">AI</span>}
                   {engine.name}
                 </span>
                 <ExternalLink className="h-3 w-3 opacity-50" />
               </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs flex items-center gap-2">
              <Settings className="h-3 w-3" />
              Default Search Engine
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={defaultSearchEngine} onValueChange={(v) => setDefaultSearchEngine(v as SearchEngineId)}>
              {SEARCH_ENGINES.map((engine) => (
                <DropdownMenuRadioItem key={engine.id} value={engine.id} className="text-xs">
                  {engine.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
