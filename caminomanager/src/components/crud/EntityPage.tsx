'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EditPersonModal } from './EditPersonModal';
import { EntityTable } from './EntityTable';
import { EntityModal } from './EntityModal';
import { DynamicEntityModal } from './DynamicEntityModal';
import { useCrud } from '@/hooks/useCrud';
import { BaseEntity, EntityConfig } from '@/types/database';
import { Search, X, Plus } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface EntityPageProps<T extends BaseEntity> {
  config: EntityConfig<T>;
  pageSize?: number;
  onRowClick?: (item: T) => void;
  onCreated?: (item: T) => void;
  hideDefaultAddButton?: boolean;
  extraActions?: React.ReactNode;
  hideDeleteInTable?: boolean;
}

export function EntityPage<T extends BaseEntity>({
  config,
  pageSize = 10,
  onRowClick,
  onCreated,
  hideDefaultAddButton = false,
  extraActions,
  hideDeleteInTable = false
}: EntityPageProps<T>) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);

  const {
    data,
    loading,
    error,
    count,
    page,
    totalPages,
    sort,
    create,
    update,
    delete: deleteItem,
    setSort,
    setPage,
    setSearch,
    search,
    clearError
  } = useCrud<T>({
    tableName: config.tableName,
    searchFields: config.searchFields,
    defaultSort: config.defaultSort,
    pageSize,
    foreignKeys: config.foreignKeys
  });

  const handleSave = async (formData: Omit<T, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (editing) {
        await update(editing.id!, formData as Partial<T>);
      } else {
        const created = await create(formData);
        if (onCreated && created) {
          setModalOpen(false);
          setEditing(null);
          onCreated(created);
          return;
        }
      }
      setModalOpen(false);
      setEditing(null);
    } catch (error) {
      // Error is handled by the hook
      console.error('Error saving entity:', error);
    }
  };

  const handleEdit = (item: T) => {
    setEditing(item);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteItem(id);
    } catch (error) {
      console.error('Error deleting entity:', error);
    }
  };

  const handleSort = (field: keyof T) => {
    setSort({ field, asc: sort.field === field ? !sort.asc : true });
  };

  const handleAddNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditing(null);
    clearError();
  };

  // Create table columns from config
  const columns = config.fields
    .filter(field => !field.hiddenInTable) // Filtrar campos ocultos en la tabla
    .map(field => {
      const foreignKeyConfig = config.foreignKeys?.find(fk => fk.foreignKey === field.name);
      
      return {
        key: field.name as keyof T,
        label: field.tableLabel || field.label,
        sortable: config.sortableFields.includes(field.name as keyof T),
        width: field.columnWidth,
        hiddenInMobile: field.hiddenInMobile,
        foreignKey: foreignKeyConfig ? {
          tableName: foreignKeyConfig.tableName,
          displayField: foreignKeyConfig.displayField,
          alias: foreignKeyConfig.alias
        } : undefined,
        // Solo usar renderValue si no hay foreignKey configurado
        render: (!foreignKeyConfig && config.renderValue) ? (value: any, _item: T) => {
          return config.renderValue!(field.name, value);
        } : undefined
      };
    });

  // Determine if we need dynamic modal (has foreign keys that need dynamic options)
  const needsDynamicModal = config.fields.some(field => 
    field.name.includes('_id') && field.type === 'select' && 
    (field.name === 'country_id' || field.name === 'state_id' || field.name === 'city_id' || field.name === 'zone_id' || field.name === 'diocese_id' || field.name === 'parish_id' || field.name === 'spouse_id' || field.name === 'step_way_id')
  );

  const pluralName = config.pluralName ?? `${config.displayName}s`;

  return (
    <div className="w-full space-y-4">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{pluralName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading && count === 0
              ? 'Cargando registros…'
              : `${count} ${count === 1 ? 'registro' : 'registros'}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {extraActions}
          {!hideDefaultAddButton && (
            <Button onClick={handleAddNew} className="w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Agregar {config.displayName.toLowerCase()}
            </Button>
          )}
        </div>
      </div>

    <div className="w-full rounded-xl border bg-card shadow-xs p-3 sm:p-5">
      {/* Error Display */}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={
              config.displayName === 'Comunidad'
                ? 'Buscar por número o parroquia...'
                : `Buscar ${config.displayName.toLowerCase()}...`
            }
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-muted transition-colors cursor-pointer"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <EntityTable
        data={data}
        columns={columns}
        loading={loading}
        sort={sort}
        onSort={handleSort}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRowClick={onRowClick}
        emptyMessage={`No hay ${pluralName.toLowerCase()}`}
        hideDeleteInTable={hideDeleteInTable}
      />

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
        <span className="text-sm text-muted-foreground">
          Página {page} de {totalPages || 1}
        </span>
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>

            {totalPages > 1 && (() => {
              const pages: (number | string)[] = [];
              if (totalPages <= 5) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                pages.push(1);
                if (page > 3) pages.push('start-ellipsis');
                for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
                  pages.push(i);
                }
                if (page < totalPages - 2) pages.push('end-ellipsis');
                pages.push(totalPages);
              }
              return pages.map((p) =>
                typeof p === 'string' ? (
                  <PaginationItem key={p}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink
                      isActive={p === page}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                )
              );
            })()}

            <PaginationItem>
              <PaginationNext
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Modal */}
      {config.tableName === 'people' && editing?.id ? (
        <EditPersonModal personIds={[editing.id]} onClose={handleCloseModal} />
      ) : needsDynamicModal ? (
        <DynamicEntityModal
          key={editing ? `edit-${editing.id}` : 'create'}
          open={modalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          initial={editing}
          fields={config.fields}
          title={editing ? `Editar ${config.displayName.toLowerCase()}` : `Agregar ${config.displayName.toLowerCase()}`}
          loading={loading}
          size={config.formSize}
        />
      ) : (
        <EntityModal
          key={editing ? `edit-${editing.id}` : 'create'}
          open={modalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          initial={editing}
          fields={config.fields}
          title={editing ? `Editar ${config.displayName.toLowerCase()}` : `Agregar ${config.displayName.toLowerCase()}`}
          loading={loading}
        />
      )}
    </div>
    </div>
  );
}
