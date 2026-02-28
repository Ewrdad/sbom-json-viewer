import { useDeferredValue, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  flexRender,
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
import { ChevronLeft, ChevronRight, ArrowUpDown, Search, Filter } from "lucide-react";
import { CopyButton } from "@/components/common/CopyButton";
import { useSelection } from "../../context/SelectionContext";
import { cn, formatComponentName } from "../../lib/utils";
import { HelpTooltip } from "@/components/common/HelpTooltip";
import { useDependencyAnalysis } from "../../hooks/useDependencyAnalysis";
import { getSbomSizeProfile } from "../../lib/sbomSizing";
import { type formattedSBOM } from "../../types/sbom";
import { getLicenseCategory } from "../../lib/licenseUtils";

function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  const trimmed = highlight?.trim();
  if (!trimmed || trimmed.length < 2) return <span>{text}</span>;
  const regex = new RegExp(`(${trimmed})`, "gi");
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-500/30 text-foreground rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

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

  const { status: dependencyStatus, analysis } = useDependencyAnalysis(sbom);
  const [directOnly, setDirectOnly] = useState(false);

  // Transform components to Array for the table
  const data = useMemo(() => {
    let list = Array.isArray(sbom.components) ? sbom.components : Array.from(sbom.components);
    
    if (directOnly && analysis) {
      list = list.filter((c: any) => {
        const ref = (c as any).bomRef?.value || (c as any).bomRef;
        if (!ref) return true;
        const upstreams = analysis.inverseDependencyMap.get(ref as string) || [];
        return upstreams.length === 0;
      });
    }
    
    return list;
  }, [sbom, directOnly, analysis]);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "name",
        size: 300,
        minSize: 100,
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="pl-0 hover:bg-transparent"
            >
              Name
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const name = row.getValue("name") as string;
          const rawSources = row.original._rawSources || [];
          const isMerged = rawSources.length > 1;
          
          return (
            <div className="flex items-center gap-2 min-w-0">
              <div className="font-medium truncate" title={name}>
                <HighlightedText text={formatComponentName(name)} highlight={deferredFilter} />
              </div>
              {isMerged && (
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
                }>
                  <Badge variant="outline" className="h-4 px-1 text-[8px] uppercase font-black bg-primary/5 text-primary border-primary/20 cursor-help shrink-0">
                    Merged
                  </Badge>
                </HelpTooltip>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "purl",
        size: 200,
        minSize: 100,
        header: () => (
          <div className="flex items-center gap-1">
            PURL
            <HelpTooltip text="Package URL (PURL) - A standardized way to identify and locate a software package." />
          </div>
        ),
        cell: ({ row }) => {
          const purl = row.getValue("purl") as string;
          if (!purl) return <span className="text-muted-foreground text-[10px]">—</span>;
          return (
            <div className="flex items-center gap-1 group/purl overflow-hidden">
              <code className="text-[10px] bg-muted px-1 py-0.5 rounded truncate flex-1 min-w-0" title={purl}>
                {purl}
              </code>
              <CopyButton value={purl} tooltip="Copy PURL" className="h-5 w-5 opacity-0 group-hover/purl:opacity-100 shrink-0" />
            </div>
          );
        },
      },
      {
        accessorKey: "version",
        size: 100,
        minSize: 50,
        header: () => (
          <div className="flex items-center gap-1">
            Version
            <HelpTooltip text="The specific version of the component found." />
          </div>
        ),
      },
      {
        accessorKey: "group",
        size: 150,
        minSize: 80,
        header: () => (
          <div className="flex items-center gap-1">
            Group
            <HelpTooltip text="The vendor or namespace group of the component (e.g. @angular, org.apache)." />
          </div>
        ),
      },
      {
        accessorKey: "type",
        size: 100,
        minSize: 60,
        header: () => (
          <div className="flex items-center gap-1">
            Type
            <HelpTooltip text="Component type (library, application, framework, container, etc.)." />
          </div>
        ),
      },
      {
        id: "formattedLicenses",
        size: 150,
        minSize: 100,
        header: () => (
          <div className="flex items-center gap-1">
            Licenses
            <HelpTooltip text="Licenses declared by this component." />
          </div>
        ),
        accessorFn: (row) => row.licenses,
        cell: ({ row }) => {
          const licenses = row.original.licenses;
          const licenseArray = Array.isArray(licenses) ? licenses : Array.from(licenses || []);
          const count = licenseArray.length;

          if (count === 0)
            return <Badge variant="secondary" className="text-[10px] px-1 py-0 h-5 opacity-50 font-normal">None</Badge>;

          return (
            <div className="flex flex-wrap gap-1">
              {licenseArray
                .slice(0, 2)
                .map((l, i) => {
                  const id = l.id || l.name;
                  const name = id || "Unknown";
                  const category = getLicenseCategory(id);
                  
                  let badgeVariant: "secondary" | "destructive" | "outline" | "default" = "secondary";
                  let customClassName = "text-[10px] px-1 py-0 h-5 font-mono";
                  
                  if (category === "copyleft") {
                    badgeVariant = "destructive";
                  } else if (category === "weak-copyleft") {
                    customClassName += " bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
                  } else if (category === "permissive") {
                    customClassName += " bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
                  } else if (category === "unknown") {
                    badgeVariant = "outline";
                  }

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
    [],
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
                <HelpTooltip text="Searches across all visible columns (Name, PURL, Version, Group, Type, and Licenses)." />
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
                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead 
                          key={header.id}
                          style={{ width: header.getSize() }}
                          className="relative group/header"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                          {/* Resizer */}
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className={cn(
                              "absolute right-0 top-0 h-full w-1 bg-primary/20 cursor-col-resize opacity-0 group-hover/header:opacity-100 transition-opacity",
                              header.column.getIsResizing() ? "bg-primary opacity-100 w-1.5" : ""
                            )}
                          />
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
                        data-state={
                          row.original === selectedComponent
                            ? "selected"
                            : undefined
                        }
                        className={cn(
                          "cursor-pointer transition-colors",
                          row.original === selectedComponent
                            ? "bg-primary/20 hover:bg-primary/30"
                            : "hover:bg-muted/50",
                        )}
                        onClick={() => setSelectedComponent(row.original)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-end space-x-2 py-4 flex-none">
              <div className="text-sm text-muted-foreground">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </div>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
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
