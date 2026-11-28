"use client"
import { type AppTableFeatures } from "@/lib/tableFeatures";
import type { RowData } from "@tanstack/react-table";

import * as React from "react"
import {
  FlexRender,
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
import { toSentenceCase } from "@/lib/text-format"

type DataGridProps<TData extends RowData> = {
  table: TanStackTable<AppTableFeatures, TData>
  emptyMessage?: string
  loading?: boolean
  loadingMessage?: string
  className?: string
  renderColumnFilter?: (column: Column<AppTableFeatures, TData, unknown>) => React.ReactNode
  getHeaderClassName?: (column: Column<AppTableFeatures, TData, unknown>) => string | undefined
  getHeaderStyle?: (column: Column<AppTableFeatures, TData, unknown>) => React.CSSProperties | undefined
  getRowClassName?: (row: Row<AppTableFeatures, TData>) => string | undefined
  getCellClassName?: (cell: Cell<AppTableFeatures, TData, unknown>) => string | undefined
  getCellStyle?: (cell: Cell<AppTableFeatures, TData, unknown>) => React.CSSProperties | undefined
  onRowClick?: (row: Row<AppTableFeatures, TData>) => void
  footer?: React.ReactNode
}

function DataGrid<TData extends RowData>({
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
                const columnHeader = header.column.columnDef.header
                const displayHeader =
                  typeof columnHeader === "string"
                    ? toSentenceCase(columnHeader)
                    : columnHeader
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
                            className={cn(
                              "-mx-1 flex w-fit min-h-9 items-center [.text-center_&]:mx-auto [.text-right_&]:ml-auto [.text-right_&]:mr-0 gap-1.5 rounded px-1 text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                              sorted && "text-foreground"
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {typeof displayHeader === "string" ? displayHeader : <FlexRender header={header} />}
                            {sorted === "asc" ? (
                              <ArrowUp className="size-3.5" />
                            ) : sorted === "desc" ? (
                              <ArrowDown className="size-3.5" />
                            ) : (
                              <ArrowUpDown className="size-3.5 opacity-50" />
                            )}
                          </button>
                        ) : (
                          typeof displayHeader === "string" ? displayHeader : <FlexRender header={header} />
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
                        <FlexRender cell={cell} />
                        <span className="text-xs font-normal text-muted-foreground">
                          ({row.subRows.length})
                        </span>
                      </button>
                    ) : (
                      <FlexRender cell={cell} />
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
