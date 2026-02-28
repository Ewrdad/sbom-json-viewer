import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpTooltip } from "@/components/common/HelpTooltip";
import { 
  Trophy, 
  Package, 
  ShieldAlert, 
  FileCheck, 
  CheckCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import type { MultiSbomStats } from "@/types/sbom";
import { useState, useMemo } from "react";

interface SourceEfficacyTableProps {
  sources: MultiSbomStats["sources"];
}

type SortKey = keyof MultiSbomStats["sources"][0] | "findings";

type SortConfig = {
  key: SortKey;
  direction: 'asc' | 'desc';
} | null;

/**
 * Table ranking SBOM sources by their discovery efficacy and metadata quality.
 * Includes sortable columns for components, vulnerabilities, and quality scores.
 */
export function SourceEfficacyTable({ sources }: SourceEfficacyTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'rank', direction: 'asc' });

  const sortedSources = useMemo(() => {
    const sortableItems = [...sources];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof typeof a];
        let bValue: any = b[sortConfig.key as keyof typeof b];

        if (sortConfig.key === 'findings') {
          aValue = a.vulnerabilitiesFound;
          bValue = b.vulnerabilitiesFound;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [sources, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (sortConfig?.key !== key) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  return (
    <Card className="shadow-md overflow-hidden border-muted-foreground/10">
      <CardHeader className="bg-muted/30 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 font-bold">
            Source Efficacy Ranking
            <HelpTooltip text="Sources are ranked based on discovery breadth (components), depth (vulnerabilities), and metadata quality scores." />
          </CardTitle>
          <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            <span className="flex items-center gap-1"><Trophy className="h-3 w-3 text-amber-500" /> Rank</span>
            <span className="flex items-center gap-1"><FileCheck className="h-3 w-3 text-blue-500" /> Quality</span>
            <span className="flex items-center gap-1"><ShieldAlert className="h-3 w-3 text-red-500" /> Findings</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] text-muted-foreground uppercase border-b bg-muted/20">
              <tr>
                <th className="px-4 py-3 text-center w-16 cursor-pointer hover:bg-muted/30" onClick={() => requestSort('rank')}>
                  <div className="flex items-center justify-center">Rank {getSortIcon('rank')}</div>
                </th>
                <th className="px-4 py-3 text-left cursor-pointer hover:bg-muted/30" onClick={() => requestSort('name')}>
                   <div className="flex items-center">Scanner / Source {getSortIcon('name')}</div>
                </th>
                <th className="px-4 py-3 text-center cursor-pointer hover:bg-muted/30" onClick={() => requestSort('componentsFound')}>
                  <div className="flex items-center justify-center">Components {getSortIcon('componentsFound')}</div>
                </th>
                <th className="px-4 py-3 text-center cursor-pointer hover:bg-muted/30" onClick={() => requestSort('vulnerabilitiesFound')}>
                  <div className="flex items-center justify-center">Vulnerabilities {getSortIcon('vulnerabilitiesFound')}</div>
                </th>
                <th className="px-4 py-3 text-center cursor-pointer hover:bg-muted/30" onClick={() => requestSort('metadataScore')}>
                  <div className="flex items-center justify-center">Quality Score {getSortIcon('metadataScore')}</div>
                </th>
                <th className="px-4 py-3 text-right pr-6">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedSources.map((s, i) => (
                <tr key={s.name} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${s.isBest ? 'bg-primary/5' : ''}`}>
                  <td className="px-4 py-4 text-center">
                     {s.rank === 1 ? (
                       <div className="flex justify-center"><Trophy className="h-5 w-5 text-amber-500" /></div>
                     ) : (
                       <span className="font-bold text-muted-foreground">#{s.rank}</span>
                     )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold">{s.name}</span>
                      <span className="text-[10px] text-muted-foreground">Uploaded SBOM provider</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 font-mono font-bold">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      {s.componentsFound}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1.5 font-mono font-bold">
                        <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                        {s.vulnerabilitiesFound}
                      </div>
                      {s.vulnerabilitiesFound > 0 && (
                        <div className="flex gap-1">
                          {s.criticalCount > 0 && <Badge variant="destructive" className="text-[8px] h-3 px-1 leading-none">{s.criticalCount}C</Badge>}
                          {s.highCount > 0 && <Badge className="text-[8px] h-3 px-1 leading-none bg-orange-500 border-0">{s.highCount}H</Badge>}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                     <div className="flex flex-col items-center gap-1">
                        <span className={`text-xs font-bold ${s.metadataScore > 70 ? 'text-green-600' : s.metadataScore > 40 ? 'text-amber-600' : 'text-red-600'}`}>
                          {s.metadataScore}/100
                        </span>
                        <Badge variant="secondary" className="text-[9px] h-4 py-0 uppercase font-black">Grade {s.metadataGrade}</Badge>
                     </div>
                  </td>
                  <td className="px-4 py-4 text-right pr-6">
                    {s.isBest ? (
                      <div className="flex items-center justify-end gap-1.5 text-primary text-xs font-bold">
                        <CheckCircle2 className="h-4 w-4" />
                        Primary
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-tight">Secondary Source</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
