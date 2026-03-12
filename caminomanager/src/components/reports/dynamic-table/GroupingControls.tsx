"use client";
import { Column } from "@tanstack/react-table";
import { X, Layers } from "lucide-react";
import { DynamicColumnMeta } from "./types";

interface GroupingControlsProps<TData> {
  allColumns: Column<TData, unknown>[];
  grouping: string[];
  onGroupingChange: (grouping: string[]) => void;
}

export function GroupingControls<TData>({
  allColumns,
  grouping,
  onGroupingChange,
}: GroupingControlsProps<TData>) {
  const groupableColumns = allColumns.filter((col) => {
    const meta = col.columnDef.meta as DynamicColumnMeta | undefined;
    return meta?.enableGrouping;
  });

  if (groupableColumns.length === 0) return null;

  const availableColumns = groupableColumns.filter(
    (col) => !grouping.includes(col.id)
  );

  const addGrouping = (columnId: string) => {
    onGroupingChange([...grouping, columnId]);
  };

  const removeGrouping = (columnId: string) => {
    onGroupingChange(grouping.filter((id) => id !== columnId));
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 text-sm text-gray-600">
        <Layers className="h-4 w-4" />
        <span>Agrupar:</span>
      </div>

      {grouping.map((columnId) => {
        const col = allColumns.find((c) => c.id === columnId);
        const header = col?.columnDef.header;
        const label = typeof header === "string" ? header : columnId;
        return (
          <span
            key={columnId}
            className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
          >
            {label}
            <button
              onClick={() => removeGrouping(columnId)}
              className="ml-0.5 rounded-full hover:bg-blue-200 p-1.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        );
      })}

      {availableColumns.length > 0 && (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) addGrouping(e.target.value);
          }}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
        >
          <option value="">+ Agregar agrupación</option>
          {availableColumns.map((col) => {
            const header = col.columnDef.header;
            const label = typeof header === "string" ? header : col.id;
            return (
              <option key={col.id} value={col.id}>
                {label}
              </option>
            );
          })}
        </select>
      )}

      {grouping.length > 0 && (
        <button
          onClick={() => onGroupingChange([])}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}
