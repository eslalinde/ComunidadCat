"use client";
import { type AppTableFeatures } from "@/lib/tableFeatures";
import type { RowData } from "@tanstack/react-table";
import { Column } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { DynamicColumnMeta } from "./types";

interface ColumnFilterProps<TData extends RowData> {
  column: Column<AppTableFeatures, TData, unknown>;
}

export function ColumnFilter<TData extends RowData>({ column }: ColumnFilterProps<TData>) {
  const meta = column.columnDef.meta as DynamicColumnMeta | undefined;
  const filterType = meta?.filterType;

  if (!filterType) return null;

  const filterValue = (column.getFilterValue() as string) ?? "";

  if (filterType === "select") {
    const facetedValues = column.getFacetedUniqueValues();
    const sortedUniqueValues = Array.from(facetedValues.keys())
      .filter(Boolean)
      .sort();

    const ALL_VALUE = "__all__";

    return (
      <Select
        value={filterValue || ALL_VALUE}
        onValueChange={(val) =>
          column.setFilterValue(val === ALL_VALUE ? undefined : val)
        }
      >
        <SelectTrigger className="w-full text-xs h-8">
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Todos</SelectItem>
          {sortedUniqueValues.map((value) => (
            <SelectItem key={String(value)} value={String(value)}>
              {String(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      value={filterValue}
      onChange={(e) => column.setFilterValue(e.target.value || undefined)}
      placeholder="Filtrar..."
      className="w-full h-8"
    />
  );
}
