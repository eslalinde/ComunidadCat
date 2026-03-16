import { Fragment, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MergedBrother } from '@/hooks/useCommunityData';
import { Belongs, Person } from '@/types/database';
import { createClient } from '@/utils/supabase/client';
import { Trash2, UserPlus, Plus, ChevronDown, ChevronRight, Heart, User, FileUp, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { friendlyError } from '@/lib/supabaseErrors';
import { SelectBrotherModal } from './SelectBrotherModal';
import { DynamicEntityModal } from './DynamicEntityModal';
import { MarriageModal } from './MarriageModal';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { personConfig } from '@/config/entities';
import { CARISMA_GROUP_ORDER } from '@/config/carisma';
import { CarismaBadge } from '@/components/ui/carisma-badge';
import { DropdownMenu } from 'radix-ui';
import { BulkUploadWizard } from '@/components/bulk-upload/BulkUploadWizard';

interface BrothersListProps {
  brothers: MergedBrother[];
  loading?: boolean;
  communityId: number;
  communityNumber?: string;
  teamMembers: Record<number, Belongs[]>;
  onDelete?: () => void;
  onAdd?: () => void;
}

interface CarismaGroup {
  carisma: string;
  brothers: MergedBrother[];
}

export function BrothersList({ brothers, loading, communityId, communityNumber, teamMembers, onDelete, onAdd }: BrothersListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMarriageModalOpen, setIsMarriageModalOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [brotherToDelete, setBrotherToDelete] = useState<MergedBrother | null>(null);

  const isNew = (createdAt: string | null) => {
    if (!createdAt) return false;
    return Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000;
  };

  const toggleGroup = (carisma: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(carisma)) {
        next.delete(carisma);
      } else {
        next.add(carisma);
      }
      return next;
    });
  };

  // Group brothers by carisma and sort groups/members
  const groupedBrothers = useMemo((): CarismaGroup[] => {
    const groups: Record<string, MergedBrother[]> = {};

    for (const brother of brothers) {
      const key = brother.carisma || '';
      if (!groups[key]) groups[key] = [];
      groups[key].push(brother);
    }

    // Sort brothers within each group alphabetically
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    }

    // Sort groups by CARISMA_GROUP_ORDER
    return Object.entries(groups)
      .map(([carisma, bros]) => ({ carisma, brothers: bros }))
      .sort((a, b) => {
        const orderA = CARISMA_GROUP_ORDER[a.carisma] ?? 99;
        const orderB = CARISMA_GROUP_ORDER[b.carisma] ?? 99;
        return orderA - orderB;
      });
  }, [brothers]);

  // Check if a brother is associated with any team
  const isBrotherInTeam = (brother: MergedBrother): boolean => {
    // Get all person IDs from all teams in this community
    const allTeamPersonIds = new Set<number>();
    Object.values(teamMembers).forEach(members => {
      members.forEach(member => {
        // Verify the member belongs to this community
        if (member.person_id && member.community_id === communityId) {
          allTeamPersonIds.add(member.person_id);
        }
      });
    });

    // Check if any of the brother's person IDs are in any team
    return brother.personIds.some(personId => allTeamPersonIds.has(personId));
  };

  const handleRequestDelete = (brother: MergedBrother) => {
    if (isBrotherInTeam(brother)) {
      toast.warning('No se puede eliminar este hermano porque está asociado a un equipo dentro de la comunidad.');
      return;
    }
    setBrotherToDelete(brother);
  };

  const handleDeleteConfirmed = async () => {
    if (!brotherToDelete) return;

    setDeletingId(brotherToDelete.id);
    try {
      const supabase = createClient();

      // Delete all brother records for all person IDs in this merged brother
      for (const personId of brotherToDelete.personIds) {
        const { error } = await supabase
          .from('brothers')
          .delete()
          .eq('person_id', personId)
          .eq('community_id', communityId);

        if (error) throw error;
      }

      toast.success('Hermano eliminado de la comunidad');
      // Refresh the community data
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Error deleting brother:', error);
      toast.error('Error al eliminar el hermano');
    } finally {
      setDeletingId(null);
      setBrotherToDelete(null);
    }
  };

  const handleSelectExistingBrother = async (personId: number) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('brothers')
      .insert({
        person_id: personId,
        community_id: communityId,
      });

    if (error) throw error;

    // Refresh the community data
    if (onAdd) {
      onAdd();
    }
  };

  const handleMarriageSuccess = async (husbandId?: number, wifeId?: number) => {
    if (!husbandId || !wifeId) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('brothers')
        .insert([
          { person_id: husbandId, community_id: communityId },
          { person_id: wifeId, community_id: communityId },
        ]);
      if (error) throw error;
      if (onAdd) onAdd();
    } catch (error: any) {
      console.error('Error adding marriage to community:', error);
      toast.error(friendlyError(error, 'El matrimonio fue creado pero hubo un error al agregarlo a la comunidad.'));
    }
  };

  const handleCreateNewBrother = async (data: Omit<Person, 'id' | 'created_at' | 'updated_at'>) => {
    setIsSaving(true);
    try {
      const supabase = createClient();

      // First, create the person
      const { data: newPerson, error: personError } = await supabase
        .from('people')
        .insert(data)
        .select()
        .single();

      if (personError) throw personError;

      // Then, create the brother relationship
      const { error: brotherError } = await supabase
        .from('brothers')
        .insert({
          person_id: newPerson.id,
          community_id: communityId,
        });

      if (brotherError) throw brotherError;

      toast.success('Hermano agregado a la comunidad');
      // Refresh the community data
      if (onAdd) {
        onAdd();
      }
    } catch (error: any) {
      console.error('Error creating new brother:', error);
      toast.error(friendlyError(error, 'Error al crear el hermano'));
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Cargando hermanos...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex flex-wrap justify-between items-start gap-2">
            <div>
              <CardTitle className="text-lg">Hermanos de la Comunidad</CardTitle>
              <p className="text-sm text-gray-600">
                Total: {brothers.length} {brothers.length === 1 ? 'hermano' : 'hermanos'}
              </p>
            </div>
            {onAdd && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkUploadOpen(true)}
                  className="flex items-center gap-2"
                  title="Carga masiva desde archivo CSV"
                >
                  <FileUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Carga Masiva</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSelectModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Agregar Existente</span>
                </Button>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Agregar Nuevo</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={4}
                    className="min-w-[180px] rounded-lg bg-white p-1 shadow-lg border border-gray-200 z-50"
                  >
                    <DropdownMenu.Item
                      className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-amber-50 text-sm outline-none"
                      onSelect={() => setIsCreateModalOpen(true)}
                    >
                      <User className="h-4 w-4" />
                      Hermano individual
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-amber-50 text-sm outline-none"
                      onSelect={() => setIsMarriageModalOpen(true)}
                    >
                      <Heart className="h-4 w-4" />
                      Matrimonio
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            )}
          </div>
        </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Celular</TableHead>
                {onDelete && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {brothers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                    No hay hermanos registrados
                  </TableCell>
                </TableRow>
              ) : (
                groupedBrothers.map((group) => {
                  const isCollapsed = collapsedGroups.has(group.carisma);
                  return (
                    <Fragment key={`group-${group.carisma}`}>
                      {/* Group header row */}
                      <TableRow
                        className="bg-gray-50 hover:bg-gray-100 cursor-pointer select-none"
                        onClick={() => toggleGroup(group.carisma)}
                      >
                        <TableCell colSpan={3} className="py-2">
                          <div className="flex items-center gap-1.5">
                            {isCollapsed ? (
                              <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            )}
                            <CarismaBadge carisma={group.carisma || 'Sin carisma'} size="md" />
                            <span className="text-xs text-gray-500">
                              ({group.brothers.length})
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Brother rows */}
                      {!isCollapsed && group.brothers.map((brother) => {
                        const isInTeam = isBrotherInTeam(brother);
                        const isDeleting = deletingId === brother.id;

                        return (
                          <TableRow key={brother.id}>
                            <TableCell className="font-medium pl-8">
                              <div className="flex flex-col gap-0.5">
                                <span>{brother.name}</span>
                                <div className="flex flex-wrap gap-1 min-h-[20px]">
                                  {isNew(brother.createdAt) && (
                                    <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded inline-flex items-center gap-1">
                                      <Sparkles className="w-3 h-3" />
                                      Nuevo
                                    </span>
                                  )}
                                  {brother.isItinerante && (
                                    <CarismaBadge carisma="Itinerante" size="sm" />
                                  )}
                                  {brother.isMarriage && (
                                    <span className="text-xs bg-pink-100 text-pink-800 px-2 py-1 rounded">
                                      Matrimonio
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{brother.celular || '-'}</TableCell>
                            {onDelete && (
                              <TableCell>
                                <Button
                                  variant={isInTeam ? "secondary" : "outline"}
                                  className={!isInTeam ? "text-destructive border-destructive/50 hover:bg-destructive/10" : ""}
                                  onClick={() => handleRequestDelete(brother)}
                                  disabled={isInTeam || isDeleting}
                                  title={isInTeam ? 'Este hermano está asociado a un equipo y no puede ser eliminado' : 'Eliminar hermano de la comunidad'}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    {/* Modal para seleccionar hermano existente */}
    <SelectBrotherModal
      open={isSelectModalOpen}
      onClose={() => setIsSelectModalOpen(false)}
      onSelect={handleSelectExistingBrother}
      communityId={communityId}
    />

    {/* Modal para crear nuevo hermano */}
    <DynamicEntityModal
      key={isCreateModalOpen ? 'create-brother-open' : 'create-brother-closed'}
      open={isCreateModalOpen}
      onClose={() => setIsCreateModalOpen(false)}
      onSave={handleCreateNewBrother}
      initial={null}
      fields={personConfig.fields}
      title="Crear Nuevo Hermano"
      loading={isSaving}
    />

    {/* Modal para crear matrimonio */}
    <MarriageModal
      open={isMarriageModalOpen}
      onClose={() => setIsMarriageModalOpen(false)}
      onSuccess={handleMarriageSuccess}
    />

    {/* Diálogo de confirmación para eliminar hermano */}
    <ConfirmDeleteDialog
      open={brotherToDelete !== null}
      onClose={() => setBrotherToDelete(null)}
      onConfirm={handleDeleteConfirmed}
      title="¿Eliminar hermano de la comunidad?"
      itemName={brotherToDelete?.name}
      description="¿Estás seguro de que deseas eliminar a este hermano de la comunidad?"
      loading={deletingId !== null}
    />

    {/* Wizard de carga masiva */}
    <BulkUploadWizard
      open={isBulkUploadOpen}
      onClose={() => setIsBulkUploadOpen(false)}
      communityId={communityId}
      communityNumber={communityNumber || ''}
      onComplete={() => {
        if (onAdd) onAdd();
      }}
    />
  </>
  );
}
