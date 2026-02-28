import { useState, useMemo, useDeferredValue } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight, Filter, ArrowUpDown } from "lucide-react";
import { useSelection } from "../../context/SelectionContext";
import { getLicenseCategory } from "../../lib/licenseUtils";
import { HelpTooltip } from "@/components/common/HelpTooltip";
import { getSbomSizeProfile } from "../../lib/sbomSizing";
import type { formattedSBOM } from "@/types/sbom";

/**
 * @function formatComponentName
 * @description Helper to format component names for display
 */
function formatComponentName(name: string) {
  return name.split('/').pop() || name;
}

/**
 * @function HighlightedText
 * @description Renders text with highlighted search matches
 */
function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${highlight})`, "gi");
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 text-foreground rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

/**
 * @function ComponentExplorer
 * @description A powerful data table for browsing and searching all components in the SBOM.
 * Supports sorting, global filtering, deduplication "Merged" badges, and direct/transitive 
 * dependency filtering.
 * 
 * @example
 * <ComponentExplorer sbom={mySbom} formattedSbom={formattedData} />
 * 
 * @param {Object} props - Component props
 * @param {any} props.sbom - The raw SBOM data
 * @param {formattedSBOM} [props.formattedSbom] - Optional pre-formatted SBOM data
 */
export function ComponentExplorer({ 
  sbom,
  formattedSbom 
}: { 
  sbom: any;
  formattedSbom?: formattedSBOM | null;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const { selectedComponent, setSelectedComponent } = useSelection();
  const deferredFilter = useDeferredValue(globalFilter);
  const { componentCount, isLarge } = getSbomSizeProfile(sbom);

  const [directOnly, setDirectOnly] = useState(false);

  const dependencyStatus = formattedSbom?.status || "idle";
  const dependencyGraph = formattedSbom?.graph;

  const data = useMemo(() => {
    let components = Array.from(sbom.components || []);
    
    if (directOnly && dependencyGraph) {
      const rootId = sbom.metadata?.component?.bomRef?.value || sbom.metadata?.component?.bomRef;
      if (rootId) {
        const directRefs = dependencyGraph[rootId] || [];
        components = components.filter((c: any) => 
          directRefs.includes(c.bomRef?.value || c.bomRef)
        );
      }
    }
    
    return components;
  }, [sbom.components, directOnly, dependencyGraph, sbom.metadata?.component]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }: any) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent text-xs font-bold uppercase tracking-wider h-auto"
          >
            Name
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }: any) => {
          const name = row.getValue("name") as string;
          const rawSources = row.original._rawSources || [];
          const isMerged = rawSources.length > 1;
          
          return (
            <div className="flex items-center gap-2 min-w-0">
              <div className="font-medium truncate" title={name}>
                <HighlightedText text={formatComponentName(name)} highlight={deferredFilter} />
              </div>
              {isMerged && (
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="h-4 px-1 text-[8px] uppercase font-black bg-primary/5 text-primary border-primary/20 shrink-0">
                    Merged
                  </Badge>
                  <HelpTooltip text={
                    <div className="space-y-1.5 p-1">
                      <p className="font-bold text-[10px] uppercase text-primary">Found in {rawSources.length} sources:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {rawSources.map((s: any, i: number) => (
                          <li key={i} className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                            {s.name} {i === 0 && <span className="text-[8px] font-bold text-green-600 ml-1">(Primary)</span>}
                          </li>
                        ))}
                      </ul>
                      <p className="text-[9px] italic border-t pt-1 mt-1 opacity-70">Metadata from the primary source is shown.</p>
                    </div>
                  } />
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "version",
        header: "Version",
        cell: ({ row }: any) => (
          <div className="font-mono text-xs text-muted-foreground truncate">
            {row.getValue("version") || "—"}
          </div>
        ),
      },
      {
        accessorKey: "group",
        header: "Group",
        cell: ({ row }: any) => (
          <div className="text-xs text-muted-foreground truncate max-w-[120px]">
            {row.getValue("group") || "—"}
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }: any) => (
          <Badge variant="outline" className="capitalize text-[10px] h-5 py-0">
            {row.getValue("type") || "unknown"}
          </Badge>
        ),
      },
      {
        accessorKey: "purl",
        header: "PURL",
        cell: ({ row }: any) => (
          <div className="font-mono text-[10px] text-muted-foreground truncate max-w-[200px]" title={row.getValue("purl")}>
            {row.getValue("purl") || "—"}
          </div>
        ),
      },
      {
        id: "formattedLicenses",
        header: "Licenses",
        accessorFn: (row: any) => {
          const lics = Array.from(row.licenses || []);
          return lics.map((l: any) => l.license?.id || l.license?.name || l.expression).join(", ");
        },
        cell: ({ row }: any) => {
          const licenses = Array.from(row.original.licenses || []);
          const count = licenses.length;
          if (count === 0) return <span className="text-muted-foreground text-xs">—</span>;
          
          return (
            <div className="flex flex-wrap gap-1">
              {licenses.slice(0, 2).map((lic: any, i) => {
                const id = lic.license?.id || lic.license?.name || lic.expression;
                const name = lic.license?.id || lic.license?.name || lic.expression;
                const category = getLicenseCategory(id);
                
                let badgeVariant: "secondary" | "destructive" | "outline" | "default" = "secondary";
                let customClassName = "text-[10px] px-1 py-0 h-5 font-mono";
                
                if (category === "copyleft") badgeVariant = "destructive";
                if (category === "weak-copyleft") badgeVariant = "default";
                if (category === "unknown") badgeVariant = "outline";

                return (
                  <Badge 
                    key={i} 
                    variant={badgeVariant} 
                    className={customClassName}
                    title={`${name} (${category})`}
                  >
                    {name}
                  </Badge>
                );
              })}
              {count > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{count - 2}
                </span>
              )}
            </div>
          );
        },
      },
    ],
    [deferredFilter],
  );

  const table = useReactTable({
    data,
    columns,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: { pageSize: isLarge ? 50 : 25 },
    },
    state: {
      sorting,
      globalFilter: deferredFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const val = row.getValue(columnId);
      return String(val)
        .toLowerCase()
        .includes(String(filterValue).toLowerCase());
    },
  });

  const searchableColumns = useMemo(() => {
    return table.getAllColumns()
      .filter(col => col.getCanGlobalFilter())
      .map(col => {
        const header = col.columnDef.header;
        if (typeof header === 'string') return header;
        // Fallbacks for component-based headers
        if (col.id === 'name') return 'Name';
        if (col.id === 'purl') return 'PURL';
        if (col.id === 'version') return 'Version';
        if (col.id === 'group') return 'Group';
        if (col.id === 'type') return 'Type';
        if (col.id === 'formattedLicenses') return 'Licenses';
        return col.id;
      })
      .filter(Boolean)
      .join(", ");
  }, [table]);

  return (
    <div className="h-full flex flex-col overflow-hidden pb-6">
      <div className="h-full flex flex-col pr-2 min-w-0">
        <div className="flex items-center justify-between mb-4 flex-none">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {componentCount.toLocaleString()} components
                </Badge>
                {isLarge && (
                  <Badge variant="outline" className="text-[10px]">
                    Large SBOM mode
                  </Badge>
                )}
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search components..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="w-[180px] lg:w-[250px]"
                />
                <HelpTooltip text={`Searches across ${searchableColumns}.`} />
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant={directOnly ? "default" : "outline"} 
                  size="sm" 
                  className="h-8 gap-2"
                  onClick={() => setDirectOnly(!directOnly)}
                  disabled={dependencyStatus === "processing"}
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {directOnly ? "Showing Direct" : "Show Direct Only"}
                  </span>
                </Button>
                
                {dependencyStatus === "processing" && (
                  <Badge variant="outline" className="text-[10px] capitalize">
                    Building dependency map …
                  </Badge>
                )}
              </div>
            </div>

            <div className="rounded-md border flex-1 min-h-0 overflow-auto bg-card scrollbar-thin min-w-0">
              <Table className="w-full" style={{ width: table.getCenterTotalSize(), tableLayout: 'fixed' }}>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead 
                          key={header.id} 
                          className="text-xs font-bold uppercase tracking-wider py-3"
                          style={{ width: header.getSize() }}
                        >
                          {header.isPlaceholder
                            ? null
                            : typeof header.column.columnDef.header === "function"
                            ? header.column.columnDef.header(header.getContext())
                            : header.column.columnDef.header}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        className={cn(
                          "cursor-pointer transition-colors",
                          selectedComponent?.bomRef?.value === (row.original as any).bomRef?.value && "bg-primary/5"
                        )}
                        onClick={() => setSelectedComponent(row.original)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-2.5">
                            {typeof cell.column.columnDef.cell === "function"
                              ? cell.column.columnDef.cell(cell.getContext())
                              : cell.getValue() as any}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center text-muted-foreground italic"
                      >
                        No components found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between space-x-2 py-4 flex-none">
              <div className="text-xs text-muted-foreground">
                Showing {table.getRowModel().rows.length} of {data.length} components
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-xs font-medium">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
      </div>
    </div>
  );
}
