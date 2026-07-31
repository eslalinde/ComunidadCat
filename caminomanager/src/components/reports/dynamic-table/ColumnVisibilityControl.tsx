"use client";

import { Columns3 } from "lucide-react";
import { type Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ColumnVisibilityControlProps<TData> {
  table: Table<TData>;
}

export function ColumnVisibilityControl<TData>({
  table,
}: ColumnVisibilityControlProps<TData>) {
  const columns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Columnas"
        >
          <Columns3 className="size-4 sm:mr-2" />
          <span aria-hidden="true" className="hidden sm:inline">
            Columnas
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel>Columnas visibles</DropdownMenuLabel>
        {columns.map((column) => {
          const header = column.columnDef.header;
          const label = typeof header === "string" ? header : column.id;

          return (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(checked) =>
                column.toggleVisibility(Boolean(checked))
              }
              onSelect={(event) => event.preventDefault()}
            >
              {label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
