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
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ChevronLeft, ChevronRight, ArrowUpDown, Search } from "lucide-react";
import { ComponentDetailPanel } from "./ComponentDetailPanel";
import { cn } from "../../lib/utils";
import { useDependencyAnalysis } from "../../hooks/useDependencyAnalysis";
import { getSbomSizeProfile } from "../../lib/sbomSizing";
import { type formattedSBOM } from "../../types/sbom";

export function ComponentExplorer({ 
  sbom,
  formattedSbom 
}: { 
  sbom: any;
  formattedSbom?: formattedSBOM | null;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedComponent, setSelectedComponent] = useState<any | null>(
    null,
  );
  const deferredFilter = useDeferredValue(globalFilter);
  const { componentCount, isLarge } = getSbomSizeProfile(sbom);

  const { analysis, status: dependencyStatus } = useDependencyAnalysis(sbom);

  // Transform components to Array for the table
  const data = useMemo(() => {
    return Array.isArray(sbom.components) ? sbom.components : Array.from(sbom.components);
  }, [sbom]);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "name",
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
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue("name")}</div>
        ),
      },
      {
        accessorKey: "version",
        header: "Version",
      },
      {
        accessorKey: "group",
        header: "Group",
      },
      {
        accessorKey: "type",
        header: "Type",
      },
      {
        id: "formattedLicenses",
        header: "Licenses",
        accessorFn: (row) => row.licenses,
        cell: ({ row }) => {
          const licenses = row.original.licenses;
          const licenseArray = Array.isArray(licenses) ? licenses : Array.from(licenses || []);
          const count = licenseArray.length;

          if (count === 0)
            return <span className="text-muted-foreground text-xs">None</span>;

          return (
            <div className="flex flex-wrap gap-1">
              {licenseArray
                .slice(0, 2)
                .map((l, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="text-[10px] px-1 py-0 h-5"
                  >
                    {l.id || l.name || "Unknown"}
                  </Badge>
                ))}
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
      <ResizablePanelGroup
        direction="horizontal"
        key={selectedComponent ? "split" : "single"}
      >
        <ResizablePanel
          defaultSize={selectedComponent ? 50 : 100}
          minSize={10}
          id="explorer-panel"
        >
          <div className="h-full flex flex-col pr-2 min-w-0">
            <div className="flex items-center justify-between mb-4 flex-none">
              <h2 className="text-3xl font-bold tracking-tight">
                Component Explorer
              </h2>
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
              </div>
              {dependencyStatus === "processing" && (
                <Badge variant="outline" className="text-[10px] capitalize">
                  Building dependency map …
                </Badge>
              )}
            </div>

            <div className="rounded-md border flex-1 overflow-auto bg-card scrollbar-thin min-w-0">
              <Table className="w-full">
                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
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
        </ResizablePanel>

        {selectedComponent && (
          <>
            <ResizableHandle
              withHandle
              className="w-2 bg-border hover:bg-primary/50 transition-colors"
            />
            <ResizablePanel defaultSize={50} minSize={15} id="detail-panel">
              <div className="h-full pl-2">
                <ComponentDetailPanel
                  component={selectedComponent}
                  analysis={analysis}
                  onClose={() => setSelectedComponent(null)}
                />
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
