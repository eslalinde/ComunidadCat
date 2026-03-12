'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useCrud } from '@/hooks/useCrud';
import { ParishCatechesis } from '@/types/database';
import { Calendar, FileText, ExternalLink, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { DynamicEntityModal } from '@/components/crud/DynamicEntityModal';
import { parishCatechesisConfig } from '@/config/entities';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { friendlyError } from '@/lib/supabaseErrors';

interface ParishCatechesisHistoryProps {
  parishId: number;
  parishName: string;
}

export function ParishCatechesisHistory({ parishId, parishName }: ParishCatechesisHistoryProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ParishCatechesis | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const itemsPerPage = 4;

  const { data: catechesisList, loading, count, fetchData, create, update } = useCrud<ParishCatechesis>({
    tableName: 'parish_catechesis',
    searchFields: ['catechist_team'],
    defaultSort: { field: 'id', asc: false },
    pageSize: 10,
  });

  useEffect(() => {
    if (parishId) {
      fetchData({
        filters: { parish_id: parishId }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchData is intentionally unstable (depends on filters state); only re-run when parishId changes
  }, [parishId]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
    });
  };

  const formatDateFull = (dateString?: string) => {
    if (!dateString) return 'No especificada';
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  const handleAddEntry = async (data: any) => {
    setIsSaving(true);
    try {
      const entryData: Omit<ParishCatechesis, 'id' | 'created_at' | 'updated_at'> = {
        ...data,
        parish_id: parishId,
        attendance_count: data.attendance_count ? parseInt(data.attendance_count, 10) : null,
      };

      await create(entryData);
      toast.success('Catequesis registrada');
      setIsAddModalOpen(false);
      await fetchData({ filters: { parish_id: parishId } });
    } catch (error) {
      console.error('Error adding catechesis entry:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditEntry = async (data: any) => {
    if (!editingEntry?.id) return;
    setIsSaving(true);
    try {
      const entryData = {
        ...data,
        parish_id: parishId,
        attendance_count: data.attendance_count ? parseInt(data.attendance_count, 10) : null,
      };
      await update(editingEntry.id, entryData);
      toast.success('Catequesis actualizada');
      setIsEditModalOpen(false);
      setEditingEntry(null);
      await fetchData({ filters: { parish_id: parishId } });
    } catch (error) {
      console.error('Error updating catechesis entry:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (entry: ParishCatechesis) => {
    setEditingEntry(entry);
    setIsEditModalOpen(true);
  };

  const formFields = useMemo(() => {
    return parishCatechesisConfig.fields.filter(field => field.name !== 'parish_id');
  }, []);

  const handleDeleteClick = (entryId: number) => {
    setDeletingId(entryId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId || isDeleting) return;

    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error, count } = await supabase
        .from('parish_catechesis')
        .delete({ count: 'exact' })
        .eq('id', deletingId);

      if (error) throw error;
      if (count === 0) {
        throw new Error('No se pudo eliminar el registro. Es posible que no tengas permisos.');
      }

      toast.success('Catequesis eliminada');
      setIsDeleteDialogOpen(false);
      setDeletingId(null);

      await fetchData({ filters: { parish_id: parishId } });
    } catch (error) {
      console.error('Error deleting catechesis entry:', error);
      toast.error(friendlyError(error, 'Error al eliminar el registro'));
    } finally {
      setIsDeleting(false);
    }
  };

  const sortedList = useMemo(() => {
    return [...catechesisList].sort((a, b) => {
      const dateA = a.actual_start_date || a.planned_start_date || '';
      const dateB = b.actual_start_date || b.planned_start_date || '';
      return dateB.localeCompare(dateA);
    });
  }, [catechesisList]);

  const displayedLogs = sortedList.slice(0, itemsPerPage);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Catequesis Realizadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Catequesis Realizadas {count > 0 && <span className="text-gray-400 font-normal">({count})</span>}
          </CardTitle>
          <div className="flex items-center gap-2 print-hidden">
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Agregar
            </Button>
            {count > itemsPerPage && (
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Ver todos
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Catequesis Realizadas - {parishName}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {sortedList.map((entry) => (
                      <div key={entry.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span>Inicio: {formatDateFull(entry.actual_start_date)}</span>
                            </div>
                            {entry.attendance_count && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {entry.attendance_count} asistentes
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              type="button"
                              className="flex items-center justify-center w-10 h-10 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                              onClick={() => handleEditClick(entry)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="flex items-center justify-center w-10 h-10 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                              onClick={() => handleDeleteClick(entry.id!)}
                              disabled={deletingId === entry.id}
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">Planificado:</span>{' '}
                            {formatDateFull(entry.planned_start_date)}
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Inicio real:</span>{' '}
                            {formatDateFull(entry.actual_start_date)}
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Convivencia:</span>{' '}
                            {formatDateFull(entry.birth_retreat_date)}
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Asistencia:</span>{' '}
                            {entry.attendance_count ?? 'No registrada'}
                          </div>
                        </div>

                        {entry.catechist_team && (
                          <div className="text-sm text-gray-700">
                            <p className="font-medium mb-1">Equipo de Catequistas:</p>
                            <p className="whitespace-pre-wrap">{entry.catechist_team}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Screen view - horizontal cards */}
        <div className="print-hidden">
          {displayedLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No hay catequesis registradas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {displayedLogs.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-3 space-y-2 relative group">
                  {/* Date header */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatDate(entry.actual_start_date || entry.planned_start_date) || 'Sin fecha'}
                    </span>
                    <div className="flex gap-2 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        className="flex items-center justify-center w-10 h-10 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => handleEditClick(entry)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="flex items-center justify-center w-10 h-10 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        onClick={() => handleDeleteClick(entry.id!)}
                        disabled={deletingId === entry.id}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Attendance */}
                  {entry.attendance_count && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span>{entry.attendance_count} asistentes</span>
                    </div>
                  )}

                  {/* Retreat date */}
                  {entry.birth_retreat_date && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span>Conv. {formatDate(entry.birth_retreat_date)}</span>
                    </div>
                  )}

                  {/* Team */}
                  {entry.catechist_team && (
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {entry.catechist_team}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Print view */}
        <div className="hidden print:block">
          {sortedList.length === 0 ? (
            <p className="text-sm text-gray-500">No hay catequesis registradas</p>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 px-2 font-semibold">F. Inicio</th>
                  <th className="text-left py-1 px-2 font-semibold">Convivencia</th>
                  <th className="text-left py-1 px-2 font-semibold">Asistencia</th>
                  <th className="text-left py-1 px-2 font-semibold">Equipo</th>
                </tr>
              </thead>
              <tbody>
                {sortedList.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-200">
                    <td className="py-1 px-2 whitespace-nowrap">{formatDateFull(entry.actual_start_date || entry.planned_start_date)}</td>
                    <td className="py-1 px-2 whitespace-nowrap">{formatDateFull(entry.birth_retreat_date)}</td>
                    <td className="py-1 px-2 whitespace-nowrap">{entry.attendance_count ?? '-'}</td>
                    <td className="py-1 px-2">{entry.catechist_team || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>

      {/* Modal para agregar nueva catequesis */}
      <DynamicEntityModal
        key={isAddModalOpen ? 'add-catechesis-open' : 'add-catechesis-closed'}
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddEntry}
        initial={{} as any}
        fields={formFields}
        title="Agregar Catequesis"
        loading={isSaving}
      />

      {/* Modal para editar catequesis */}
      <DynamicEntityModal
        key={editingEntry ? `edit-catechesis-${editingEntry.id}` : 'no-edit-catechesis'}
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleEditEntry}
        initial={editingEntry}
        fields={formFields}
        title="Editar Catequesis"
        loading={isSaving}
      />

      {/* Dialogo de confirmacion para eliminar */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsDeleteDialogOpen(false);
          setDeletingId(null);
        }
      }}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar catequesis?</DialogTitle>
              <DialogDescription>
                ¿Estas seguro de que deseas eliminar este registro de catequesis? Esta accion no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDeletingId(null);
                }}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeleting || !deletingId}
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
