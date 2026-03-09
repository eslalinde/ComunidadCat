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
import { ClipboardList, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/contexts/AuthContext';
import type { CommunityVisit } from '@/types/database';
import type { FormField } from '@/types/database';

const visitFormFields: FormField[] = [
  {
    name: 'visit_date',
    label: 'Fecha de la Visita',
    type: 'date',
    required: true,
    placeholder: 'Seleccione la fecha',
  },
  {
    name: 'visitor_name',
    label: 'Visitante',
    type: 'text',
    required: false,
    maxLength: 256,
    placeholder: 'Nombre de quien realizó la visita',
  },
  {
    name: 'description',
    label: 'Descripción',
    type: 'textarea',
    required: true,
    placeholder: 'Descripción de la visita, temas tratados, observaciones...',
  },
  {
    name: 'topics_discussed',
    label: 'Temas Tratados',
    type: 'textarea',
    required: false,
    placeholder: 'Lista de temas discutidos (opcional)',
  },
];

interface CommunityVisitsProps {
  communityId: number;
  communityNumber: string;
  defaultVisitorName?: string;
}

export function CommunityVisits({ communityId, communityNumber, defaultVisitorName }: CommunityVisitsProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAllOpen, setIsAllOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<CommunityVisit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const itemsPerPage = 4;

  const { data: visits = [], isLoading } = useQuery({
    queryKey: queryKeys.community.visits(communityId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('community_visits')
        .select('*')
        .eq('community_id', communityId)
        .order('visit_date', { ascending: false });

      if (error) throw error;
      return (data || []) as CommunityVisit[];
    },
  });

  const invalidateVisits = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.community.visits(communityId) });

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No especificada';
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  const handleAdd = async (data: any) => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('community_visits').insert({
        ...data,
        community_id: communityId,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success('Visita registrada');
      setIsAddModalOpen(false);
      await invalidateVisits();
    } catch (error) {
      console.error('Error adding visit:', error);
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
        .from('community_visits')
        .delete({ count: 'exact' })
        .eq('id', entryToDelete.id);

      if (error) throw error;
      if (count === 0) {
        throw new Error('No se pudo eliminar el registro. Es posible que no tengas permisos.');
      }

      toast.success('Visita eliminada');
      setEntryToDelete(null);
      await invalidateVisits();
    } catch (error) {
      console.error('Error deleting visit:', error);
      toast.error(friendlyError(error, 'Error al eliminar la visita'));
    } finally {
      setIsDeleting(false);
    }
  };

  const displayedVisits = visits.slice(0, itemsPerPage);
  const count = visits.length;

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Visitas a la Comunidad</CardTitle>
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
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Visitas a la Comunidad
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
                    Ver todas ({count})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5" />
                      Visitas - Comunidad {communityNumber}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {visits.map((visit) => (
                      <div
                        key={visit.id}
                        className="group/entry border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-semibold text-gray-900">
                                {formatDate(visit.visit_date)}
                              </p>
                              {visit.visitor_name && (
                                <span className="text-xs text-gray-500">
                                  por {visit.visitor_name}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {visit.description}
                            </p>
                            {visit.topics_discussed && (
                              <p className="text-xs text-gray-500 mt-2">
                                <span className="font-medium">Temas:</span>{' '}
                                {visit.topics_discussed}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover/entry:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                            onClick={() => setEntryToDelete(visit)}
                            title="Eliminar visita"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
        {displayedVisits.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No hay visitas registradas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedVisits.map((visit) => (
              <div
                key={visit.id}
                className="group/entry border rounded-lg p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDate(visit.visit_date)}
                      </p>
                      {visit.visitor_name && (
                        <span className="text-xs text-gray-500">
                          por {visit.visitor_name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {visit.description}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover/entry:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0 -mt-1"
                    onClick={() => setEntryToDelete(visit)}
                    title="Eliminar visita"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Modal para agregar visita */}
      <DynamicEntityModal
        key={isAddModalOpen ? 'add-visit-open' : 'add-visit-closed'}
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAdd}
        initial={{
          visit_date: new Date().toISOString().split('T')[0],
          visitor_name: defaultVisitorName || '',
        } as any}
        fields={visitFormFields}
        title="Registrar Visita a la Comunidad"
        loading={isSaving}
      />

      {/* Diálogo de confirmación para eliminar */}
      <ConfirmDeleteDialog
        open={entryToDelete !== null}
        onClose={() => setEntryToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar visita?"
        itemName="Visita a la comunidad"
        description={`Estas seguro de que deseas eliminar esta visita de la Comunidad ${communityNumber}?`}
        preview={[
          `Fecha: ${entryToDelete?.visit_date ? formatDate(entryToDelete.visit_date) : 'No especificada'}`,
          ...(entryToDelete?.visitor_name ? [`Visitante: ${entryToDelete.visitor_name}`] : []),
          ...(entryToDelete?.description ? [`Descripcion: ${entryToDelete.description.substring(0, 80)}...`] : []),
        ]}
        loading={isDeleting}
      />
    </Card>
  );
}
