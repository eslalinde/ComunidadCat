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
import { formatLocalDate, todayLocalISO } from '@/lib/dates';
import { ClipboardList, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { queryKeys } from '@/lib/queryKeys';
import type { CommunityVisit } from '@/types/database';
import type { FormField } from '@/types/database';
import { Hint } from '@/components/ui/tooltip';
import { EmptyState } from '@/components/ui/empty-state';

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

  const formatDate = (dateString?: string) => formatLocalDate(dateString);

  const handleAdd = async (data: any) => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('community_visits').insert({
        ...data,
        community_id: communityId,
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
          <CardTitle>Visitas a la Comunidad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
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
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Visitas a la Comunidad
          </CardTitle>
          <div className="flex items-center gap-2 print-hidden">
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
            {count > itemsPerPage && (
              <Dialog open={isAllOpen} onOpenChange={setIsAllOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                    Ver todas ({count})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80dvh] overflow-y-auto">
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
                        className="group/entry border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-semibold text-foreground">
                                {formatDate(visit.visit_date)}
                              </p>
                              {visit.visitor_name && (
                                <span className="text-xs text-muted-foreground">
                                  por {visit.visitor_name}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                              {visit.description}
                            </p>
                            {visit.topics_discussed && (
                              <p className="text-xs text-muted-foreground mt-2">
                                <span className="font-medium">Temas:</span>{' '}
                                {visit.topics_discussed}
                              </p>
                            )}
                          </div>
                          <Hint label="Eliminar visita">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="md:opacity-0 md:group-hover/entry:opacity-100 transition-opacity text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                              onClick={() => setEntryToDelete(visit)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </Hint>
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
          <EmptyState icon={ClipboardList} title="No hay visitas registradas" />
        ) : (
          <div className="space-y-3">
            {displayedVisits.map((visit) => (
              <div
                key={visit.id}
                className="group/entry border rounded-lg p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-foreground">
                        {formatDate(visit.visit_date)}
                      </p>
                      {visit.visitor_name && (
                        <span className="text-xs text-muted-foreground">
                          por {visit.visitor_name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {visit.description}
                    </p>
                  </div>
                  <Hint label="Eliminar visita">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="md:opacity-0 md:group-hover/entry:opacity-100 transition-opacity text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0 -mt-1"
                      onClick={() => setEntryToDelete(visit)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Hint>
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
          visit_date: todayLocalISO(),
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
        title="¿Eliminar visita?"
        itemName="Visita a la comunidad"
        description={`Se eliminará esta visita de la Comunidad ${communityNumber}. Esta acción no se puede deshacer.`}
        requireTypedConfirmation={false}
        previewTitle="Detalles"
        preview={[
          `Fecha: ${entryToDelete?.visit_date ? formatDate(entryToDelete.visit_date) : 'No especificada'}`,
          ...(entryToDelete?.visitor_name ? [`Visitante: ${entryToDelete.visitor_name}`] : []),
          ...(entryToDelete?.description
            ? [`Descripción: ${entryToDelete.description.length > 80 ? `${entryToDelete.description.substring(0, 80)}…` : entryToDelete.description}`]
            : []),
        ]}
        loading={isDeleting}
      />
    </Card>
  );
}
