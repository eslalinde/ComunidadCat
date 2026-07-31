"use client";
import { useState, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  getFacetedUniqueValues,
  getPaginationRowModel,
  flexRender,
  SortingState,
  ColumnFiltersState,
  ExpandedState,
  PaginationState,
  VisibilityState,
  Row,
} from "@tanstack/react-table";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataGrid } from "@/components/ui/data-grid";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { DynamicReportTableProps, DynamicColumnMeta } from "./types";
import { exportTableToCSV } from "./utils";
import { GlobalFilter } from "./GlobalFilter";
import { ColumnFilter } from "./ColumnFilter";
import { GroupingControls } from "./GroupingControls";
import { ColumnVisibilityControl } from "./ColumnVisibilityControl";

export function DynamicReportTable<TData>({
  config,
  data,
  loading,
  onRefresh,
}: DynamicReportTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(
    config.defaultSorting ?? []
  );
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [grouping, setGrouping] = useState<string[]>(
    config.defaultGrouping ?? []
  );
  const [expanded, setExpanded] = useState<ExpandedState>(true);
  const [isExporting, setIsExporting] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    config.dataGrid?.defaultColumnVisibility ?? {}
  );
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: config.dataGrid?.pageSize ?? 10,
  });

  const table = useReactTable({
    data,
    columns: config.columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      grouping,
      expanded,
      columnVisibility,
      ...(config.dataGrid ? { pagination } : {}),
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    onColumnVisibilityChange: setColumnVisibility,
    ...(config.dataGrid ? { onPaginationChange: setPagination } : {}),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    ...(config.dataGrid
      ? { getPaginationRowModel: getPaginationRowModel() }
      : {}),
    enableGrouping: true,
  });

  const handleExport = useCallback(() => {
    setIsExporting(true);
    try {
      exportTableToCSV(table, config.exportFileName ?? "reporte");
    } finally {
      setIsExporting(false);
    }
  }, [table, config.exportFileName]);

  const handleGlobalFilterChange = useCallback((value: string) => {
    setGlobalFilter(value);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, []);

  const handleGroupingChange = useCallback((newGrouping: string[]) => {
    setGrouping(newGrouping);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, []);

  // Compute footer aggregations
  const hasAggregations = config.columns.some((col) => {
    const meta = col.meta as DynamicColumnMeta | undefined;
    return meta?.aggregationType;
  });

  const filteredLeafRowCount = table.getFilteredRowModel().rows.reduce(
    (count, row) => count + countLeafRows(row),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={routes.reportes}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900">
              {config.title}
            </h1>
            <p className="text-sm sm:text-base text-gray-600">{config.description}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onRefresh} disabled={loading} size="sm" className="sm:size-default">
            <RefreshCw
              className={`w-4 h-4 sm:mr-2 ${loading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
          <Button
            onClick={handleExport}
            disabled={loading || isExporting || data.length === 0}
            size="sm"
            className="sm:size-default"
          >
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">{isExporting ? "Exportando..." : "Exportar CSV"}</span>
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <GlobalFilter
            value={globalFilter}
            onChange={handleGlobalFilterChange}
            placeholder={
              config.globalFilterPlaceholder ?? "Buscar en todos los campos..."
            }
          />
          <GroupingControls
            allColumns={table.getAllColumns()}
            grouping={grouping}
            onGroupingChange={handleGroupingChange}
          />
          {config.dataGrid && <ColumnVisibilityControl table={table} />}
        </div>
      </div>

      {/* Table */}
      <Card className="p-2 sm:p-6">
        {config.dataGrid ? (
          <DataGrid
            table={table}
            loading={loading}
            loadingMessage="Cargando datos..."
            emptyMessage="No hay datos disponibles"
            className="[&_table]:min-w-[52rem]"
            renderColumnFilter={(column) => (
              <ColumnFilter column={column} />
            )}
            getRowClassName={(row) =>
              row.getIsGrouped() ? "bg-gray-50 font-semibold" : undefined
            }
            getCellClassName={(cell) => {
              const meta = cell.column.columnDef.meta as
                | DynamicColumnMeta
                | undefined;
              const align = meta?.align ?? "left";
              return `px-3 py-2 ${
                align === "center"
                  ? "text-center"
                  : align === "right"
                    ? "text-right"
                    : "text-left"
              }`;
            }}
          />
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Cargando datos...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No hay datos disponibles</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const meta = header.column.columnDef
                        .meta as DynamicColumnMeta | undefined;
                      const align = meta?.align ?? "left";
                      return (
                        <TableHead
                          key={header.id}
                          colSpan={header.colSpan}
                          className={`px-3 ${align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"}`}
                        >
                          {header.isPlaceholder ? null : (
                            <div className="space-y-1">
                              <div
                                className={`flex items-center gap-1 ${
                                  header.column.getCanSort()
                                    ? "cursor-pointer select-none hover:text-gray-900"
                                    : ""
                                }`}
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                                {header.column.getCanSort() && (
                                  <span className="ml-1">
                                    {header.column.getIsSorted() === "asc" ? (
                                      <ArrowUp className="h-3 w-3" />
                                    ) : header.column.getIsSorted() ===
                                      "desc" ? (
                                      <ArrowDown className="h-3 w-3" />
                                    ) : (
                                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                                    )}
                                  </span>
                                )}
                              </div>
                              <ColumnFilter column={header.column} />
                            </div>
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={
                      row.getIsGrouped() ? "bg-gray-50 font-semibold" : ""
                    }
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef
                        .meta as DynamicColumnMeta | undefined;
                      const align = meta?.align ?? "left";

                      return (
                        <TableCell
                          key={cell.id}
                          className={`px-3 py-2 ${align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"}`}
                        >
                          {cell.getIsGrouped() ? (
                            <button
                              onClick={row.getToggleExpandedHandler()}
                              className="flex items-center gap-1"
                            >
                              {row.getIsExpanded() ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}{" "}
                              <span className="text-gray-500 font-normal text-xs">
                                ({row.subRows.length})
                              </span>
                            </button>
                          ) : cell.getIsAggregated() ? (
                            flexRender(
                              cell.column.columnDef.aggregatedCell ??
                                cell.column.columnDef.cell,
                              cell.getContext()
                            )
                          ) : cell.getIsPlaceholder() ? null : (
                            flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>

              {hasAggregations && data.length > 0 && (
                <TableFooter>
                  <TableRow className="bg-gray-100 font-semibold">
                    {table.getAllLeafColumns().map((column, index) => {
                      const meta = column.columnDef
                        .meta as DynamicColumnMeta | undefined;
                      const align = meta?.align ?? "left";

                      if (index === 0) {
                        return (
                          <TableCell key={column.id} className="px-3 py-2">
                            Totales
                          </TableCell>
                        );
                      }

                      if (meta?.aggregationType) {
                        const allRows = table.getFilteredRowModel().flatRows.filter(
                          (r) => !r.getIsGrouped()
                        );
                        let value: number;
                        if (meta.aggregationType === "count") {
                          value = allRows.length;
                        } else if (meta.aggregationType === "sum") {
                          value = allRows.reduce(
                            (sum, row) =>
                              sum + (Number(row.getValue(column.id)) || 0),
                            0
                          );
                        } else {
                          const unique = new Set(
                            allRows
                              .map((row) => row.getValue(column.id))
                              .filter(Boolean)
                          );
                          value = unique.size;
                        }
                        return (
                          <TableCell
                            key={column.id}
                            className={`px-3 py-2 ${align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"}`}
                          >
                            {meta.aggregationLabel
                              ? `${meta.aggregationLabel}: ${value}`
                              : value}
                          </TableCell>
                        );
                      }

                      return (
                        <TableCell key={column.id} className="px-3 py-2" />
                      );
                    })}
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        )}

        {data.length > 0 &&
          (config.dataGrid ? (
            <div className="mt-4 flex flex-col gap-3 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-between gap-3 sm:justify-start">
                <span>
                  Página {table.getState().pagination.pageIndex + 1} de{" "}
                  {Math.max(1, table.getPageCount())} · {filteredLeafRowCount}{" "}
                  registros
                </span>
                <label className="flex items-center gap-2">
                  <span className="sr-only sm:not-sr-only">Filas:</span>
                  <select
                    aria-label="Filas por página"
                    value={table.getState().pagination.pageSize}
                    onChange={(event) => table.setPageSize(Number(event.target.value))}
                    className="h-9 rounded-md border bg-background px-2 text-foreground"
                  >
                    {[5, 10, 20, 50].map((pageSize) => (
                      <option key={pageSize} value={pageSize}>
                        {pageSize}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="flex-1 sm:flex-none"
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="flex-1 sm:flex-none"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-center text-sm text-gray-500">
              Mostrando {filteredLeafRowCount} registros
              {filteredLeafRowCount !== data.length &&
                ` (de ${data.length} totales)`}
            </div>
          ))}
      </Card>
    </div>
  );
}

function countLeafRows<TData>(row: Row<TData>): number {
  if (row.subRows && row.subRows.length > 0) {
    return row.subRows.reduce((count, subRow) => count + countLeafRows(subRow), 0);
  }
  return 1;
}
