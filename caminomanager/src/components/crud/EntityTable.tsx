import { type AppTableFeatures, appTableFeatures } from "@/lib/tableFeatures";
import { Fragment, useRef, useState } from 'react';
import {
  functionalUpdate,
  type ColumnDef,
  type SortingState,
  useTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataGrid } from '@/components/ui/data-grid';
import { toSentenceCase } from '@/lib/text-format';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BaseEntity } from '@/types/database';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);

  const handleDeleteDialogClose = () => {
    const trigger = deleteTriggerRef.current;
    const targetId = deleteTarget?.id;
    setDeleteTarget(null);
    window.setTimeout(() => {
      const currentTrigger = targetId
        ? document.querySelector<HTMLButtonElement>(
            `[data-delete-entity-id="${targetId}"]`,
          )
        : null;
      (trigger?.isConnected ? trigger : currentTrigger)?.focus();
    }, 0);
  };

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
              aria-label={`Editar ${getItemLabel(item)}`}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                if (onRowClick) { onRowClick(item); } else { onEdit(item); }
              }}
            >
              <Pencil className="h-4 w-4" />
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
                aria-label={`Eliminar ${getItemLabel(item)}`}
                data-delete-entity-id={item.id}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (item.id) {
                    deleteTriggerRef.current = e.currentTarget as HTMLButtonElement;
                    setDeleteTarget({ id: item.id, label: getItemLabel(item) });
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Eliminar</TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );

  // Touch devices: tooltips never show and small adjacent icons invite mis-taps,
  // so actions live in a 44px "more" menu with visible text labels.
  const renderMobileActions = (item: T) => {
    const label = getItemLabel(item);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="size-11 -mr-2 -mt-1 shrink-0"
            aria-label={`Acciones para ${label}`}
            data-delete-entity-id={item.id}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem
            className="min-h-11 text-base"
            onSelect={() => {
              if (onRowClick) { onRowClick(item); } else { onEdit(item); }
            }}
          >
            <Pencil />
            Editar
          </DropdownMenuItem>
          {!hideDeleteInTable && (
            <DropdownMenuItem
              variant="destructive"
              className="min-h-11 text-base"
              onSelect={() => {
                if (item.id) {
                  deleteTriggerRef.current = null;
                  setDeleteTarget({ id: item.id, label });
                }
              }}
            >
              <Trash2 />
              Eliminar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const dataGridColumns: ColumnDef<AppTableFeatures, T>[] = [
    ...columns.map((column) => ({
      id: String(column.key),
      accessorFn: (item: T) => item[column.key],
      header: column.label,
      enableSorting: Boolean(column.sortable),
      cell: ({ row }: { row: { original: T } }) =>
        getCellValue(row.original, column),
    })),
    {
      id: 'actions',
      header: 'Acciones',
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => renderActions(row.original),
    },
  ];
  const sorting: SortingState = [
    { id: String(sort.field), desc: !sort.asc },
  ];
  const table = useTable({
    features: appTableFeatures,
    manualPagination: true,
    data,
    columns: dataGridColumns,
    state: { sorting },
    manualSorting: true,
    enableSortingRemoval: false,
    onSortingChange: (updater) => {
      const nextSorting = functionalUpdate(updater, sorting);
      const nextColumn = nextSorting[0];
      if (nextColumn) onSort(nextColumn.id as keyof T);
    },
  });

  return (
    <>
      {/* Mobile: Card view */}
      {isMobile ? (
        loading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando...</div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">{emptyMessage}</div>
        ) : (
          <div className="space-y-3">
            {data.map((item, index) => (
              <div
                key={item.id || index}
                className={`rounded-lg border bg-card p-3 shadow-sm touch-manipulation ${onRowClick ? "cursor-pointer active:bg-accent" : ""}`}
                onClick={() => onRowClick?.(item)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {visibleColumns[0] && (
                      <div className="text-base font-semibold leading-snug break-words">
                        {getCellValue(item, visibleColumns[0])}
                      </div>
                    )}
                    {visibleColumns.length > 1 && (
                      <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-sm">
                        {visibleColumns.slice(1).map((column) => (
                          <Fragment key={String(column.key)}>
                            <dt className="text-xs leading-5 text-muted-foreground">
                              {toSentenceCase(column.label)}
                            </dt>
                            <dd className="min-w-0 truncate leading-5 text-foreground/90">
                              {getCellValue(item, column) || <span className="text-muted-foreground">—</span>}
                            </dd>
                          </Fragment>
                        ))}
                      </dl>
                    )}
                  </div>
                  {renderMobileActions(item)}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <DataGrid
          table={table}
          loading={loading}
          loadingMessage="Cargando..."
          emptyMessage={emptyMessage}
          className="[&_table]:min-w-[44rem]"
          getHeaderClassName={(column) =>
            column.id === 'actions'
              ? 'w-[80px] whitespace-nowrap text-center'
              : 'whitespace-nowrap'
          }
          getHeaderStyle={(column) => {
            const configured = columns.find(
              (candidate) => String(candidate.key) === column.id,
            );
            return configured?.width ? { width: configured.width } : undefined;
          }}
          getRowClassName={() =>
            onRowClick ? 'cursor-pointer' : undefined
          }
          getCellClassName={(cell) =>
            cell.column.id === 'actions'
              ? 'w-[80px] text-center'
              : 'max-w-0 truncate'
          }
          getCellStyle={(cell) => {
            const configured = columns.find(
              (candidate) => String(candidate.key) === cell.column.id,
            );
            return configured?.width ? { width: configured.width } : undefined;
          }}
          onRowClick={onRowClick ? (row) => onRowClick(row.original) : undefined}
        />
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onClose={handleDeleteDialogClose}
        onConfirm={handleDeleteConfirmed}
        title="¿Eliminar registro?"
        itemName={deleteTarget?.label}
        description="Esta acción no se puede deshacer."
      />
    </>
  );
}
