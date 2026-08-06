"use client"

import * as React from "react"
import {
  flexRender,
  type Cell,
  type Column,
  type Row,
  type Table as TanStackTable,
} from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  LoaderCircle,
} from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type DataGridProps<TData> = {
  table: TanStackTable<TData>
  emptyMessage?: string
  loading?: boolean
  loadingMessage?: string
  className?: string
  renderColumnFilter?: (column: Column<TData, unknown>) => React.ReactNode
  getHeaderClassName?: (column: Column<TData, unknown>) => string | undefined
  getHeaderStyle?: (column: Column<TData, unknown>) => React.CSSProperties | undefined
  getRowClassName?: (row: Row<TData>) => string | undefined
  getCellClassName?: (cell: Cell<TData, unknown>) => string | undefined
  getCellStyle?: (cell: Cell<TData, unknown>) => React.CSSProperties | undefined
  onRowClick?: (row: Row<TData>) => void
  footer?: React.ReactNode
}

function DataGrid<TData>({
  table,
  emptyMessage = "No hay registros",
  loading = false,
  loadingMessage = "Cargando registros",
  className,
  renderColumnFilter,
  getHeaderClassName,
  getHeaderStyle,
  getRowClassName,
  getCellClassName,
  getCellStyle,
  onRowClick,
  footer,
}: DataGridProps<TData>) {
  const rows = table.getRowModel().rows

  return (
    <div
      data-slot="data-grid"
      className={cn("overflow-x-auto rounded-md border", className)}
    >
      <Table aria-busy={loading}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted()
                return (
                  <TableHead
                    key={header.id}
                    className={getHeaderClassName?.(header.column)}
                    style={getHeaderStyle?.(header.column)}
                    aria-sort={
                      sorted === "asc"
                        ? "ascending"
                        : sorted === "desc"
                          ? "descending"
                          : "none"
                    }
                  >
                    {header.isPlaceholder ? null : (
                      <div className="space-y-1">
                        {header.column.getCanSort() ? (
                          <button
                            type="button"
                            className="flex min-h-9 items-center gap-2 text-left"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {sorted === "asc" ? (
                              <ArrowUp className="size-3.5" />
                            ) : sorted === "desc" ? (
                              <ArrowDown className="size-3.5" />
                            ) : (
                              <ArrowUpDown className="size-3.5 opacity-50" />
                            )}
                          </button>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )
                        )}
                        {renderColumnFilter?.(header.column)}
                      </div>
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={table.getVisibleLeafColumns().length}
                className="h-28 text-center"
              >
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" />
                  {loadingMessage}
                </span>
              </TableCell>
            </TableRow>
          ) : rows.length ? (
            rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={getRowClassName?.(row)}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(event) => {
                  if (!onRowClick) return
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    onRowClick(row)
                  }
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={getCellClassName?.(cell)}
                    style={getCellStyle?.(cell)}
                  >
                    {cell.getIsGrouped() ? (
                      <button
                        type="button"
                        className="flex items-center gap-1"
                        onClick={row.getToggleExpandedHandler()}
                      >
                        {row.getIsExpanded() ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        <span className="text-xs font-normal text-muted-foreground">
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
                      flexRender(cell.column.columnDef.cell, cell.getContext())
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={table.getVisibleLeafColumns().length}
                className="h-28 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {!loading && rows.length > 0 ? footer : null}
      </Table>
    </div>
  )
}

export { DataGrid }
