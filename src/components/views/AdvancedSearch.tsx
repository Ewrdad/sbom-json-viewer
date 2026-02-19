import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Search } from "lucide-react";

export interface SearchCriteria {
  name: string;
  version: string;
  group: string;
  type: string;
  license: string;
  severity: string;
}

interface AdvancedSearchProps {
  onSearch: (criteria: SearchCriteria) => void;
  onClear: () => void;
  onClose: () => void;
  initialCriteria?: SearchCriteria;
}

export function AdvancedSearch({ onSearch, onClear, onClose, initialCriteria }: AdvancedSearchProps) {
  const [criteria, setCriteria] = useState<SearchCriteria>(initialCriteria || {
    name: "",
    version: "",
    group: "",
    type: "",
    license: "",
    severity: "",
  });

  const handleChange = (field: keyof SearchCriteria, value: string) => {
    const newCriteria = { ...criteria, [field]: value };
    setCriteria(newCriteria);
    onSearch(newCriteria);
  };

  const handleClear = () => {
    const cleared = {
      name: "",
      version: "",
      group: "",
      type: "",
      license: "",
      severity: "",
    };
    setCriteria(cleared);
    onClear();
  };

  return (
    <div className="bg-muted/30 p-4 rounded-lg border border-border/50 mb-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Advanced Search</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="search-name" className="text-[10px] uppercase font-bold text-muted-foreground">Name</Label>
          <Input
            id="search-name"
            placeholder="Search by name..."
            value={criteria.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="search-version" className="text-[10px] uppercase font-bold text-muted-foreground">Version</Label>
          <Input
            id="search-version"
            placeholder="Search by version..."
            value={criteria.version}
            onChange={(e) => handleChange("version", e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="search-group" className="text-[10px] uppercase font-bold text-muted-foreground">Group</Label>
          <Input
            id="search-group"
            placeholder="Search by group..."
            value={criteria.group}
            onChange={(e) => handleChange("group", e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="search-type" className="text-[10px] uppercase font-bold text-muted-foreground">Component Type</Label>
          <Select value={criteria.type} onValueChange={(val) => val && handleChange("type", val)}>
            <SelectTrigger id="search-type" className="h-8 text-sm">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="library">Library</SelectItem>
              <SelectItem value="application">Application</SelectItem>
              <SelectItem value="framework">Framework</SelectItem>
              <SelectItem value="container">Container</SelectItem>
              <SelectItem value="operating-system">Operating System</SelectItem>
              <SelectItem value="firmware">Firmware</SelectItem>
              <SelectItem value="file">File</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="search-license" className="text-[10px] uppercase font-bold text-muted-foreground">License</Label>
          <Input
            id="search-license"
            placeholder="Search by license ID/name..."
            value={criteria.license}
            onChange={(e) => handleChange("license", e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="search-severity" className="text-[10px] uppercase font-bold text-muted-foreground">Min Severity</Label>
          <Select value={criteria.severity} onValueChange={(val) => val && handleChange("severity", val)}>
            <SelectTrigger id="search-severity" className="h-8 text-sm">
              <SelectValue placeholder="Any severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any severity</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
              <SelectItem value="High">High or higher</SelectItem>
              <SelectItem value="Medium">Medium or higher</SelectItem>
              <SelectItem value="Low">Low or higher</SelectItem>
              <SelectItem value="none">No vulnerabilities</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
        <Button variant="outline" size="sm" onClick={handleClear} className="h-8 text-xs">
          Clear Filters
        </Button>
      </div>
    </div>
  );
}
