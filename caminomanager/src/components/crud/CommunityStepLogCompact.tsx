'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CommunityStepLog as CommunityStepLogType } from '@/types/database';
import { FileText, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { DynamicEntityModal } from '@/components/crud/DynamicEntityModal';
import { communityStepLogConfig } from '@/config/entities';
import { ConfirmDeleteDialog } from '@/components/crud/ConfirmDeleteDialog';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { friendlyError } from '@/lib/supabaseErrors';

interface CommunityStepLogCompactProps {
  communityId: number;
  communityNumber: string;
  stepLogs: CommunityStepLogType[];
  loading: boolean;
  onStepLogAdded?: () => void;
  onStepLogDeleted?: () => void;
  defaultCatechistName?: string;
  actualBrothers?: number;
  readOnly?: boolean;
}

export function CommunityStepLogCompact({ communityId, communityNumber, stepLogs, loading, onStepLogAdded, onStepLogDeleted, defaultCatechistName, actualBrothers, readOnly }: CommunityStepLogCompactProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<CommunityStepLogType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const itemsPerPage = 4;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No especificada';
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  const getDotColor = (outcome?: boolean) => {
    if (outcome === true) return 'bg-green-500';
    if (outcome === false) return 'bg-amber-400';
    return 'bg-gray-300';
  };

  const handleAddEntry = async (data: any) => {
    setIsSaving(true);
    try {
      const supabase = createClient();

      // Extraer campo virtual brothers_count
      const brothersCount = data.brothers_count ? parseInt(data.brothers_count, 10) : null;
      delete data.brothers_count;

      // Anexar hermanos a las notas si se proporcionó
      if (brothersCount) {
        data.notes = data.notes
          ? `${data.notes}\nHermanos: ${brothersCount}`
          : `Hermanos: ${brothersCount}`;
      }

      // Convertir outcome de string a boolean
      const outcomeValue = data.outcome === 'true' ? true : data.outcome === 'false' ? false : null;

      const entryData = {
        ...data,
        community_id: communityId,
        outcome: outcomeValue,
      };

      const { error } = await supabase
        .from('community_step_log')
        .insert(entryData);

      if (error) throw error;

      // Preparar actualización de la comunidad
      const communityUpdate: Record<string, any> = {};

      // Si el paso está "Cerrada" y tiene step_way_id, actualizar etapa
      if (outcomeValue === true && data.step_way_id) {
        communityUpdate.step_way_id = parseInt(data.step_way_id, 10);
        communityUpdate.last_step_way_date = data.date_of_step || new Date().toISOString().split('T')[0];
      }

      // Actualizar hermanos actuales si se proporcionó
      if (brothersCount) {
        communityUpdate.actual_brothers = brothersCount;
      }

      // Hacer un solo update a la comunidad si hay algo que actualizar
      if (Object.keys(communityUpdate).length > 0) {
        await supabase
          .from('communities')
          .update(communityUpdate)
          .eq('id', communityId);
      }

      toast.success('Registro agregado a la bitácora');
      setIsAddModalOpen(false);
      onStepLogAdded?.();
    } catch (error) {
      console.error('Error adding step log entry:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // Preparar los campos del formulario, excluyendo community_id y agregando hermanos (virtual)
  const formFields = useMemo(() => {
    const fields = communityStepLogConfig.fields.filter(field => field.name !== 'community_id');
    // Insertar campo virtual de hermanos antes de notas
    const notesIndex = fields.findIndex(f => f.name === 'notes');
    fields.splice(notesIndex >= 0 ? notesIndex : fields.length, 0, {
      name: 'brothers_count',
      label: 'Hermanos Actuales',
      type: 'number',
      required: false,
      placeholder: 'Número de hermanos actuales',
    });
    return fields;
  }, []);

  const handleDeleteClick = (entry: CommunityStepLogType) => {
    setEntryToDelete(entry);
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete?.id || isDeleting) return;

    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error, count } = await supabase
        .from('community_step_log')
        .delete({ count: 'exact' })
        .eq('id', entryToDelete.id);

      if (error) throw error;
      if (count === 0) {
        throw new Error('No se pudo eliminar el registro. Es posible que no tengas permisos.');
      }

      toast.success('Registro eliminado de la bitácora');
      setEntryToDelete(null);
      onStepLogDeleted?.();
    } catch (error) {
      console.error('Error deleting step log entry:', error);
      toast.error(friendlyError(error, 'Error al eliminar el registro'));
    } finally {
      setIsDeleting(false);
    }
  };

  const count = stepLogs.length;
  // Mostrar solo los primeros 2 elementos en la vista compacta
  const displayedLogs = stepLogs.slice(0, itemsPerPage);

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Bitácora</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
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
          <CardTitle className="text-lg">Bitácora</CardTitle>
          <div className="flex items-center gap-2 print-hidden">
            {!readOnly && (
              <Button
                variant="outline"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            )}
            {count > itemsPerPage && (
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Ver todos ({count})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Bitácora - Comunidad {communityNumber}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="relative">
                    {stepLogs.map((entry, index) => (
                      <div key={entry.id} className="group/entry relative flex gap-4 pb-5 last:pb-0">
                        {/* Línea vertical + dot */}
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${getDotColor(entry.outcome)}`} />
                          {index < stepLogs.length - 1 && (
                            <div className="w-px flex-1 bg-gray-200 mt-1" />
                          )}
                        </div>
                        {/* Contenido */}
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 leading-tight">
                                {entry.step_way?.name || 'Sin paso'}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">{formatDate(entry.date_of_step)}</p>
                              {entry.notes && (
                                <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{entry.notes}</p>
                              )}
                            </div>
                            {!readOnly && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover/entry:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0 -mt-1"
                                onClick={() => handleDeleteClick(entry)}
                                disabled={entryToDelete?.id === entry.id}
                                title="Eliminar evento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {/* Vista normal (pantalla) - timeline vertical */}
        <div className="print-hidden">
          {displayedLogs.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No hay entradas en el log</p>
            </div>
          ) : (
            <div className="relative">
              {displayedLogs.map((entry, index) => (
                <div key={entry.id} className="group/entry relative flex gap-3 pb-4 last:pb-0">
                  {/* Línea vertical + dot */}
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${getDotColor(entry.outcome)}`} />
                    {index < displayedLogs.length - 1 && (
                      <div className="w-px flex-1 bg-gray-200 mt-1" />
                    )}
                  </div>
                  {/* Contenido */}
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-tight">
                          {entry.step_way?.name || 'Sin paso'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatDate(entry.date_of_step)}</p>
                        {entry.notes && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{entry.notes}</p>
                        )}
                      </div>
                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover/entry:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0 -mt-1"
                          onClick={() => handleDeleteClick(entry)}
                          disabled={entryToDelete?.id === entry.id}
                          title="Eliminar evento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vista de impresión - muestra TODOS los registros en tabla compacta */}
        <div className="hidden print:block">
          {stepLogs.length === 0 ? (
            <p className="text-sm text-gray-500">No hay entradas en la bitácora</p>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 px-2 font-semibold">Fecha</th>
                  <th className="text-left py-1 px-2 font-semibold">Paso</th>
                  <th className="text-left py-1 px-2 font-semibold">Estado</th>
                  <th className="text-left py-1 px-2 font-semibold">Notas</th>
                </tr>
              </thead>
              <tbody>
                {stepLogs.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-200">
                    <td className="py-1 px-2 whitespace-nowrap">{formatDate(entry.date_of_step)}</td>
                    <td className="py-1 px-2 whitespace-nowrap">{entry.step_way?.name || '-'}</td>
                    <td className="py-1 px-2 whitespace-nowrap">{entry.outcome === true ? 'Cerrada' : entry.outcome === false ? 'Abierta' : '-'}</td>
                    <td className="py-1 px-2">{entry.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>

      {/* Modal para agregar nuevo registro */}
      <DynamicEntityModal
        key={isAddModalOpen ? 'add-step-log-open' : 'add-step-log-closed'}
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddEntry}
        initial={{
          date_of_step: new Date().toISOString().split('T')[0],
          principal_catechist_name: defaultCatechistName || '',
          brothers_count: actualBrothers || '',
        } as any}
        fields={formFields}
        title="Agregar Registro a la Bitácora"
        loading={isSaving}
      />

      {/* Diálogo de confirmación para eliminar */}
      <ConfirmDeleteDialog
        open={entryToDelete !== null}
        onClose={() => setEntryToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="¿Eliminar evento de bitácora?"
        itemName={entryToDelete?.step_way?.name || 'Evento de bitácora'}
        description={`¿Estás seguro de que deseas eliminar este registro de la Comunidad ${communityNumber}?`}
        preview={[
          `Paso: ${entryToDelete?.step_way?.name || 'Sin paso'}`,
          `Fecha: ${entryToDelete?.date_of_step ? new Date(entryToDelete.date_of_step).toLocaleDateString('es-CO') : 'No especificada'}`,
          ...(entryToDelete?.notes ? [`Notas: ${entryToDelete.notes}`] : []),
        ]}
        loading={isDeleting}
      />
    </Card>
  );
}
