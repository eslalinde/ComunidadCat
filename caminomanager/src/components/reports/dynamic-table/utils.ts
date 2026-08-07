import { Table, Row } from "@tanstack/react-table";
import { DynamicColumnMeta } from "./types";
import { toSentenceCase } from "@/lib/text-format";

function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function exportTableToCSV<TData>(
  table: Table<TData>,
  fileName: string
) {
  const visibleColumns = table
    .getAllLeafColumns()
    .filter((col) => col.getIsVisible());

  const headers = visibleColumns
    .map((col) =>
      escapeCSVValue(
        toSentenceCase(
          typeof col.columnDef.header === "string"
            ? col.columnDef.header
            : col.id,
        ),
      ),
    )
    .join(",");

  // Get only leaf (non-grouped) rows for export
  const rows = table.getFilteredRowModel().rows;

  function flattenRows(rows: Row<TData>[]): Row<TData>[] {
    const result: Row<TData>[] = [];
    for (const row of rows) {
      if (row.subRows && row.subRows.length > 0) {
        result.push(...flattenRows(row.subRows));
      } else {
        result.push(row);
      }
    }
    return result;
  }

  const leafRows = flattenRows(rows);

  const csvRows = leafRows.map((row) =>
    visibleColumns
      .map((col) => escapeCSVValue(row.getValue(col.id)))
      .join(",")
  );

  const csvContent = [headers, ...csvRows].join("\n");
  const BOM = "\uFEFF";
  const csvWithBOM = BOM + csvContent;

  const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `${fileName}_${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getAggregationFn(type: DynamicColumnMeta["aggregationType"]) {
  switch (type) {
    case "count":
      return (_columnId: string, _leafRows: Row<any>[], childRows: Row<any>[]) =>
        childRows.length;
    case "sum":
      return (columnId: string, _leafRows: Row<any>[], childRows: Row<any>[]) =>
        childRows.reduce(
          (sum, row) => sum + (Number(row.getValue(columnId)) || 0),
          0
        );
    case "uniqueCount":
      return (columnId: string, _leafRows: Row<any>[], childRows: Row<any>[]) => {
        const unique = new Set(
          childRows.map((row) => row.getValue(columnId)).filter(Boolean)
        );
        return unique.size;
      };
    default:
      return undefined;
  }
}
