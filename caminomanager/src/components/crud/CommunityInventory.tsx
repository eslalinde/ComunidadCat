'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DynamicEntityModal } from '@/components/crud/DynamicEntityModal';
import { ConfirmDeleteDialog } from '@/components/crud/ConfirmDeleteDialog';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { friendlyError } from '@/lib/supabaseErrors';
import { Package, ExternalLink, Plus, Trash2, Pencil } from 'lucide-react';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/contexts/AuthContext';
import type { CommunityInventoryItem, InventoryItemType, FormField } from '@/types/database';

function useInventoryItemTypes() {
  return useQuery({
    queryKey: ['options', 'inventory_item_types'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('inventory_item_types')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as InventoryItemType[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

const CONDITION_OPTIONS = [
  { value: 'bueno', label: 'Bueno' },
  { value: 'regular', label: 'Regular' },
  { value: 'malo', label: 'Malo' },
  { value: 'nuevo', label: 'Nuevo' },
];

function getInventoryFormFields(itemTypes: InventoryItemType[]): FormField[] {
  return [
    {
      name: 'item_type_id',
      label: 'Tipo de Elemento',
      type: 'select',
      required: false,
      options: itemTypes.map((t) => ({ value: t.id!, label: t.name })),
      placeholder: 'Seleccione de la lista o escriba un nombre personalizado',
    },
    {
      name: 'custom_name',
      label: 'Nombre Personalizado',
      type: 'text',
      required: false,
      maxLength: 256,
      placeholder: 'Solo si el elemento no está en la lista anterior',
    },
    {
      name: 'quantity',
      label: 'Cantidad',
      type: 'number',
      required: true,
      placeholder: '1',
    },
    {
      name: 'condition',
      label: 'Estado',
      type: 'select',
      required: false,
      options: CONDITION_OPTIONS,
      placeholder: 'Seleccione el estado del elemento',
    },
    {
      name: 'notes',
      label: 'Notas',
      type: 'textarea',
      required: false,
      placeholder: 'Observaciones adicionales (opcional)',
    },
  ];
}

function getItemDisplayName(item: CommunityInventoryItem): string {
  if (item.item_type?.name) return item.item_type.name;
  if (item.custom_name) return item.custom_name;
  return 'Elemento sin nombre';
}

function getConditionLabel(condition?: string): string | null {
  if (!condition) return null;
  const option = CONDITION_OPTIONS.find((o) => o.value === condition);
  return option ? option.label : condition;
}

function getConditionColor(condition?: string): string {
  switch (condition) {
    case 'nuevo': return 'bg-blue-100 text-blue-700';
    case 'bueno': return 'bg-green-100 text-green-700';
    case 'regular': return 'bg-yellow-100 text-yellow-700';
    case 'malo': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

interface CommunityInventoryProps {
  communityId: number;
  communityNumber: string;
}

export function CommunityInventory({ communityId, communityNumber }: CommunityInventoryProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAllOpen, setIsAllOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<CommunityInventoryItem | null>(null);
  const [entryToEdit, setEntryToEdit] = useState<CommunityInventoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const itemsPerPage = 6;

  const { data: itemTypes = [] } = useInventoryItemTypes();
  const formFields = getInventoryFormFields(itemTypes);

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: queryKeys.community.inventory(communityId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('community_inventory')
        .select('*, item_type:inventory_item_types(*)')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as CommunityInventoryItem[];
    },
  });

  const invalidateInventory = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.community.inventory(communityId) });

  const handleAdd = async (data: any) => {
    if (!data.item_type_id && !data.custom_name) {
      toast.error('Debe seleccionar un tipo de elemento o escribir un nombre personalizado');
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      const insertData: any = {
        community_id: communityId,
        quantity: data.quantity || 1,
        condition: data.condition || null,
        notes: data.notes || null,
        created_by: user?.id,
      };

      if (data.item_type_id) {
        insertData.item_type_id = data.item_type_id;
        insertData.custom_name = null;
      } else {
        insertData.item_type_id = null;
        insertData.custom_name = data.custom_name;
      }

      const { error } = await supabase.from('community_inventory').insert(insertData);
      if (error) throw error;

      toast.success('Elemento agregado al inventario');
      setIsAddModalOpen(false);
      await invalidateInventory();
    } catch (error) {
      console.error('Error adding inventory item:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (data: any) => {
    if (!entryToEdit?.id) return;
    if (!data.item_type_id && !data.custom_name) {
      toast.error('Debe seleccionar un tipo de elemento o escribir un nombre personalizado');
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      const updateData: any = {
        quantity: data.quantity || 1,
        condition: data.condition || null,
        notes: data.notes || null,
      };

      if (data.item_type_id) {
        updateData.item_type_id = data.item_type_id;
        updateData.custom_name = null;
      } else {
        updateData.item_type_id = null;
        updateData.custom_name = data.custom_name;
      }

      const { error } = await supabase
        .from('community_inventory')
        .update(updateData)
        .eq('id', entryToEdit.id);
      if (error) throw error;

      toast.success('Elemento actualizado');
      setEntryToEdit(null);
      await invalidateInventory();
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete?.id || isDeleting) return;

    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error, count } = await supabase
        .from('community_inventory')
        .delete({ count: 'exact' })
        .eq('id', entryToDelete.id);

      if (error) throw error;
      if (count === 0) {
        throw new Error('No se pudo eliminar el registro. Es posible que no tengas permisos.');
      }

      toast.success('Elemento eliminado del inventario');
      setEntryToDelete(null);
      await invalidateInventory();
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      toast.error(friendlyError(error, 'Error al eliminar el elemento'));
    } finally {
      setIsDeleting(false);
    }
  };

  const displayedItems = inventory.slice(0, itemsPerPage);
  const count = inventory.length;

  const renderItem = (item: CommunityInventoryItem, compact: boolean) => {
    const name = getItemDisplayName(item);
    const conditionLabel = getConditionLabel(item.condition);

    return (
      <div
        key={item.id}
        className={`group/entry border rounded-lg ${compact ? 'p-3' : 'p-4'} hover:bg-gray-50 transition-colors`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p className={`${compact ? 'text-sm' : 'text-sm'} font-semibold text-gray-900`}>
                {name}
              </p>
              {item.quantity > 1 && (
                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                  x{item.quantity}
                </span>
              )}
              {conditionLabel && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${getConditionColor(item.condition)}`}>
                  {conditionLabel}
                </span>
              )}
              {item.custom_name && !item.item_type_id && (
                <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                  Personalizado
                </span>
              )}
            </div>
            {item.notes && (
              <p className={`${compact ? 'text-xs' : 'text-sm'} text-gray-600 ${compact ? 'line-clamp-1' : ''}`}>
                {item.notes}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="md:opacity-0 md:group-hover/entry:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 hover:bg-gray-100 -mt-1"
              onClick={() => setEntryToEdit(item)}
              title="Editar elemento"
            >
              <Pencil className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="md:opacity-0 md:group-hover/entry:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50 -mt-1"
              onClick={() => setEntryToDelete(item)}
              title="Eliminar elemento"
            >
              <Trash2 className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Inventario de la Comunidad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Inventario
            {count > 0 && (
              <span className="text-sm font-normal text-gray-500">({count})</span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2 print-hidden">
            <Button variant="outline" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Agregar
            </Button>
            {count > itemsPerPage && (
              <Dialog open={isAllOpen} onOpenChange={setIsAllOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Ver todo ({count})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Inventario - Comunidad {communityNumber}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    {inventory.map((item) => renderItem(item, false))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {displayedItems.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No hay elementos en el inventario</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedItems.map((item) => renderItem(item, true))}
          </div>
        )}
      </CardContent>

      {/* Modal para agregar elemento */}
      <DynamicEntityModal
        key={isAddModalOpen ? 'add-inv-open' : 'add-inv-closed'}
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAdd}
        initial={{ quantity: 1 } as any}
        fields={formFields}
        title="Agregar Elemento al Inventario"
        loading={isSaving}
      />

      {/* Modal para editar elemento */}
      <DynamicEntityModal
        key={entryToEdit ? `edit-inv-${entryToEdit.id}` : 'edit-inv-closed'}
        open={entryToEdit !== null}
        onClose={() => setEntryToEdit(null)}
        onSave={handleEdit}
        initial={entryToEdit ? {
          item_type_id: entryToEdit.item_type_id || '',
          custom_name: entryToEdit.custom_name || '',
          quantity: entryToEdit.quantity,
          condition: entryToEdit.condition || '',
          notes: entryToEdit.notes || '',
        } as any : undefined}
        fields={formFields}
        title="Editar Elemento del Inventario"
        loading={isSaving}
      />

      {/* Diálogo de confirmación para eliminar */}
      <ConfirmDeleteDialog
        open={entryToDelete !== null}
        onClose={() => setEntryToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar elemento?"
        itemName={entryToDelete ? getItemDisplayName(entryToDelete) : ''}
        description={`¿Estás seguro de que deseas eliminar este elemento del inventario de la Comunidad ${communityNumber}?`}
        preview={[
          ...(entryToDelete ? [`Elemento: ${getItemDisplayName(entryToDelete)}`] : []),
          ...(entryToDelete?.quantity ? [`Cantidad: ${entryToDelete.quantity}`] : []),
          ...(entryToDelete?.condition ? [`Estado: ${getConditionLabel(entryToDelete.condition)}`] : []),
        ]}
        loading={isDeleting}
      />
    </Card>
  );
}
