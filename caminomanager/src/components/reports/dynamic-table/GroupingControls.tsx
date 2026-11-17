"use client";
import { type AppTableFeatures } from "@/lib/tableFeatures";
import type { RowData } from "@tanstack/react-table";
import { Column } from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Layers } from "lucide-react";
import { DynamicColumnMeta } from "./types";
import { toSentenceCase } from "@/lib/text-format";

interface GroupingControlsProps<TData extends RowData> {
  allColumns: Column<AppTableFeatures, TData, unknown>[];
  grouping: string[];
  onGroupingChange: (grouping: string[]) => void;
}

export function GroupingControls<TData extends RowData>({
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
        const label = toSentenceCase(
          typeof header === "string" ? header : columnId,
        );
        return (
          <span
            key={columnId}
            className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
          >
            {label}
            <button
              type="button"
              onClick={() => removeGrouping(columnId)}
              className="ml-0.5 rounded-full hover:bg-blue-200 p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Quitar agrupación por ${label}`}
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </span>
        );
      })}

      {availableColumns.length > 0 && (
        // Always empty: choosing a column adds it as a chip and resets the picker.
        <Select value="" onValueChange={(value) => value && addGrouping(value)}>
          <SelectTrigger aria-label="Agregar agrupación" className="h-7 w-auto gap-1 px-2 text-xs">
            <SelectValue placeholder="+ Agregar agrupación" />
          </SelectTrigger>
          <SelectContent>
            {availableColumns.map((col) => {
              const header = col.columnDef.header;
              const label = toSentenceCase(
                typeof header === "string" ? header : col.id,
              );
              return (
                <SelectItem key={col.id} value={col.id}>
                  {label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
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
