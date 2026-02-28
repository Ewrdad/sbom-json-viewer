import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Check, X, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import { useState, useMemo } from "react";
import type { MultiSbomStats } from "@/types/sbom";
import { Button } from "@/components/ui/button";

interface DetailedComparisonTableProps {
  crossSourceComponents: MultiSbomStats["crossSourceComponents"];
  sources: MultiSbomStats["sources"];
}

const ITEMS_PER_PAGE = 50;

/**
 * A detailed comparison of components across all loaded SBOM sources.
 * Shows which tools identified each component and the quality of metadata provided.
 */
export function DetailedComparisonTable({ crossSourceComponents = [], sources }: DetailedComparisonTableProps) {
  const [search, setSearch] = useState("");
  const [displayLimit, setDisplayLimit] = useState(ITEMS_PER_PAGE);
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredAndSorted = useMemo(() => {
    let result = crossSourceComponents.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.purl && c.purl.toLowerCase().includes(search.toLowerCase()))
    );

    result.sort((a, b) => {
      let aValue: any = a[sortKey as keyof typeof a] || "";
      let bValue: any = b[sortKey as keyof typeof b] || "";

      if (sortKey === 'foundByCount') {
        aValue = a.foundBy.length;
        bValue = b.foundBy.length;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [crossSourceComponents, search, sortKey, sortDirection]);

  const displayItems = filteredAndSorted.slice(0, displayLimit);
  const hasMore = filteredAndSorted.length > displayLimit;

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (key: string) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  return (
    <Card className="shadow-md border-muted-foreground/10">
      <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
        <div>
          <CardTitle className="text-lg font-bold">Detailed Discovery Comparison</CardTitle>
          <p className="text-xs text-muted-foreground">Consensus analysis for individual packages across tools.</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filter components..." 
            className="pl-9 h-9 text-xs" 
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setDisplayLimit(ITEMS_PER_PAGE);
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] text-muted-foreground uppercase border-b bg-muted/20">
              <tr>
                <th className="px-4 py-3 text-left min-w-[200px] cursor-pointer hover:bg-muted/30" onClick={() => toggleSort('name')}>
                  <div className="flex items-center">Component {getSortIcon('name')}</div>
                </th>
                <th className="px-4 py-3 text-center cursor-pointer hover:bg-muted/30" onClick={() => toggleSort('foundByCount')}>
                  <div className="flex items-center justify-center">Consensus {getSortIcon('foundByCount')}</div>
                </th>
                {sources.map(s => (
                  <th key={s.name} className="px-4 py-3 text-center border-l font-bold">{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayItems.map((c, i) => (
                <tr key={`${c.name}-${c.version}-${i}`} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-sm truncate max-w-[300px]" title={c.purl || c.name}>{c.name}</div>
                    <div className="text-[10px] font-mono opacity-60 truncate max-w-[300px]">{c.version}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {c.foundBy.length}/{sources.length}
                    </Badge>
                  </td>
                  {sources.map(s => {
                    const foundByThisSource = c.foundBy.includes(s.name);
                    const meta = c.metadataBySource[s.name];
                    return (
                      <td key={s.name} className="px-4 py-3 text-center border-l">
                        {foundByThisSource ? (
                          <div className="flex flex-col items-center gap-1">
                            <Check className="h-5 w-5 text-green-500 stroke-[3]" />
                            <div className="flex gap-1">
                              <div className={`w-2 h-2 rounded-full ${meta?.hasPurl ? 'bg-blue-500' : 'bg-muted'}`} title={meta?.hasPurl ? "PURL included" : "No PURL"} />
                              <div className={`w-2 h-2 rounded-full ${meta?.hasLicenses ? 'bg-emerald-500' : 'bg-muted'}`} title={meta?.hasLicenses ? "License included" : "No License"} />
                              <div className={`w-2 h-2 rounded-full ${meta?.hasHashes ? 'bg-purple-500' : 'bg-muted'}`} title={meta?.hasHashes ? "Hashes included" : "No Hashes"} />
                            </div>
                          </div>
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground/20 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {hasMore && (
          <div className="p-4 flex justify-center border-t bg-muted/5">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-xs" 
              onClick={() => setDisplayLimit(prev => prev + ITEMS_PER_PAGE)}
            >
              <ChevronDown className="h-4 w-4" />
              Show More ({filteredAndSorted.length - displayLimit} remaining)
            </Button>
          </div>
        )}

        <div className="p-4 border-t bg-muted/20 flex justify-center gap-6 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /> PURL</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> License</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500" /> Hashes</div>
        </div>
      </CardContent>
    </Card>
  );
}
