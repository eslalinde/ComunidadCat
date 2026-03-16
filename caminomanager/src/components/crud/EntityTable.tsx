import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BaseEntity } from '@/types/database';
import { Pencil, Trash2 } from 'lucide-react';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { useIsMobile } from '@/hooks/use-mobile';

interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, item: T) => React.ReactNode;
  foreignKey?: {
    tableName: string;
    displayField: string;
    alias?: string;
  };
  hiddenInMobile?: boolean;
}

interface EntityTableProps<T extends BaseEntity> {
  data: T[];
  columns: Column<T>[];
  loading: boolean;
  sort: { field: keyof T; asc: boolean };
  onSort: (field: keyof T) => void;
  onEdit: (item: T) => void;
  onDelete: (id: number) => void | Promise<void>;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  hideDeleteInTable?: boolean;
}

// Helper function to render foreign key values
function renderForeignKeyValue<T extends BaseEntity>(
  item: T,
  key: keyof T,
  foreignKey: { tableName: string; displayField: string; alias?: string }
): string {
  // Use alias if available, otherwise use table name
  const propertyName = foreignKey.alias || foreignKey.tableName;
  const relatedData = (item as any)[propertyName];

  // Check if the related data exists and has the display field
  if (relatedData && typeof relatedData === 'object') {
    return String(relatedData[foreignKey.displayField] || '');
  }

  // Fallback to showing the ID if no JOIN data is available
  const foreignKeyData = item[key] as any;
  return String(foreignKeyData || '');
}

export function EntityTable<T extends BaseEntity>({
  data,
  columns,
  loading,
  sort,
  onSort,
  onEdit,
  onDelete,
  onRowClick,
  emptyMessage = "No hay datos",
  hideDeleteInTable = false
}: EntityTableProps<T>) {
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    try {
      await onDelete(deleteTarget.id);
    } finally {
      setDeleteTarget(null);
    }
  };

  // Try to get a display label for the item being deleted
  const getItemLabel = (item: T): string => {
    // Try common name fields
    const nameField = (item as any).name || (item as any).person_name || (item as any).number;
    return nameField ? String(nameField) : `#${item.id}`;
  };

  const isMobile = useIsMobile();
  const visibleColumns = isMobile ? columns.filter(col => !col.hiddenInMobile) : columns;

  const getCellValue = (item: T, column: Column<T>) => {
    if (column.render) return column.render(item[column.key], item);
    if (column.foreignKey) return renderForeignKeyValue(item, column.key, column.foreignKey);
    return String(item[column.key] || '');
  };

  const renderActions = (item: T) => (
    <div className="flex gap-0.5 items-center">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                if (onRowClick) { onRowClick(item); } else { onEdit(item); }
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Editar</TooltipContent>
        </Tooltip>
        {!hideDeleteInTable && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (item.id) {
                    setDeleteTarget({ id: item.id, label: getItemLabel(item) });
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Eliminar</TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando...</div>;
  }

  if (data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <>
      {/* Mobile: Card view */}
      {isMobile ? (
        <div className="space-y-3">
          {data.map((item, index) => (
            <div
              key={item.id || index}
              className={`rounded-lg border bg-card p-3 shadow-sm ${onRowClick ? "cursor-pointer active:bg-gray-50" : ""}`}
              onClick={() => onRowClick?.(item)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 space-y-1">
                  {visibleColumns.map((column, colIndex) => (
                    <div key={String(column.key)} className={colIndex === 0 ? "font-medium text-sm" : "text-sm text-muted-foreground"}>
                      {colIndex > 0 && <span className="text-xs text-gray-400">{column.label}: </span>}
                      <span className={colIndex === 0 ? "" : ""}>{getCellValue(item, column)}</span>
                    </div>
                  ))}
                </div>
                {renderActions(item)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop: Table view */
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(column => (
                  <TableHead
                    key={String(column.key)}
                    className={`whitespace-nowrap ${column.sortable ? "cursor-pointer hover:bg-gray-50" : ""}`}
                    style={column.width ? { width: column.width } : undefined}
                    onClick={() => column.sortable && onSort(column.key)}
                  >
                    <div className="flex items-center gap-1">
                      {column.label}
                      {column.sortable && sort.field === column.key && (
                        <span className="text-sm">
                          {sort.asc ? "▲" : "▼"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="whitespace-nowrap text-center w-[80px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => (
                <TableRow
                  key={item.id || index}
                  className={onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map(column => (
                    <TableCell key={String(column.key)} className="truncate">
                      {getCellValue(item, column)}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex gap-0.5 items-center justify-center">
                      {renderActions(item)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirmed}
        title="¿Eliminar registro?"
        itemName={deleteTarget?.label}
        description="¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer."
      />
    </>
  );
}
