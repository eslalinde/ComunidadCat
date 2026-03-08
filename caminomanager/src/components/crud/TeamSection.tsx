import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Team, Belongs, Parish } from '@/types/database';
import { createClient } from '@/utils/supabase/client';
import { Trash2, UserMinus, Crown, UserPlus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { friendlyError } from '@/lib/supabaseErrors';
import { getCarismaLabel } from '@/config/carisma';
import { CarismaBadge } from '@/components/ui/carisma-badge';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

interface TeamSectionProps {
  team: Team;
  members: Belongs[];
  parishes: Parish[];
  loading?: boolean;
  teamNumber?: number;
  communityId: number | null;
  onDelete?: () => void;
  onAddMember?: () => void;
  onEditMember?: (personId: number) => void;
}

interface MergedMember {
  id: string;
  name: string;
  carisma: string;
  mobile: string;
  isResponsible: boolean;
  isMarriage: boolean;
  isPresbitero: boolean;
  personIds: number[];
  belongsIds: number[];
}

export function TeamSection({ team, members, parishes, loading, teamNumber, communityId: _communityId, onDelete, onAddMember, onEditMember }: TeamSectionProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [removingResponsibleId, setRemovingResponsibleId] = useState<string | null>(null);
  const [assigningResponsibleId, setAssigningResponsibleId] = useState<string | null>(null);
  const [deletingTeam, setDeletingTeam] = useState(false);
  const [showDeleteTeamDialog, setShowDeleteTeamDialog] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<MergedMember | null>(null);
  const [memberToRemoveResponsible, setMemberToRemoveResponsible] = useState<MergedMember | null>(null);
  const [memberToAssignResponsible, setMemberToAssignResponsible] = useState<MergedMember | null>(null);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando equipo...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Merge married couples in team members
  const mergedMembers = (() => {
    const processedIds = new Set<number>();
    const merged: MergedMember[] = [];

    members.forEach(member => {
      if (processedIds.has(member.person_id)) return;

      const person = member.person;
      if (!person) return;

      // Check if this person is married and spouse is also in the team
      if (person.spouse_id) {
        const spouseMember = members.find(m =>
          m.person_id === person.spouse_id &&
          !processedIds.has(m.person_id)
        );

        if (spouseMember && spouseMember.person) {
          // Create merged marriage entry
          const husband = person.gender_id === 1 ? person : spouseMember.person;
          const wife = person.gender_id === 2 ? person : spouseMember.person;

          merged.push({
            id: `marriage-${person.id}-${spouseMember.person_id}`,
            name: `${husband.person_name} y ${wife.person_name}`,
            carisma: 'Matrimonio',
            mobile: husband.mobile || wife.mobile || '',
            isResponsible: member.is_responsible_for_the_team || spouseMember.is_responsible_for_the_team,
            isMarriage: true,
            isPresbitero: false, // Married couples are not presbíteros
            personIds: [person.id!, spouseMember.person_id],
            belongsIds: [
              ...(member.id ? [member.id] : []),
              ...(spouseMember.id ? [spouseMember.id] : [])
            ]
          });

          if (person.id) processedIds.add(person.id);
          if (spouseMember.person_id) processedIds.add(spouseMember.person_id);
          return;
        }
      }

      // Single person
      const carisma = getCarismaLabel(person.person_type_id) || 'No especificado';
      merged.push({
        id: `person-${person.id}`,
        name: person.person_name,
        carisma,
        mobile: person.mobile || '',
        isResponsible: member.is_responsible_for_the_team,
        isMarriage: false,
        isPresbitero: person.person_type_id === 3, // person_type_id 3 = Presbítero
        personIds: [person.id!],
        belongsIds: member.id ? [member.id] : []
      });

      if (person.id) processedIds.add(person.id);
    });

    // Responsables primero, luego ordenar por nombre
    return merged.sort((a, b) => {
      if (a.isResponsible !== b.isResponsible) return a.isResponsible ? -1 : 1;
      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    });
  })();

  // Verificar si ya existe un responsable en el equipo
  const hasResponsible = mergedMembers.some(member => member.isResponsible);

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    setDeletingId(memberToDelete.id);
    try {
      const supabase = createClient();

      // Delete belongs records directly by their IDs
      if (memberToDelete.belongsIds.length > 0) {
        const { error, count } = await supabase
          .from('belongs')
          .delete({ count: 'exact' })
          .in('id', memberToDelete.belongsIds);

        if (error) throw error;
        if (count === 0) {
          throw new Error('No tienes permisos para eliminar miembros del equipo. Contacta al administrador.');
        }
      }

      toast.success('Miembro eliminado del equipo');
      if (onDelete) onDelete();
    } catch (error) {
      console.error('Error deleting team member:', error);
      toast.error(friendlyError(error, 'Error al eliminar el miembro del equipo'));
    } finally {
      setDeletingId(null);
      setMemberToDelete(null);
    }
  };

  const handleRemoveResponsible = async () => {
    if (!memberToRemoveResponsible) return;
    setRemovingResponsibleId(memberToRemoveResponsible.id);
    try {
      const supabase = createClient();

      // Update all belongs records to set is_responsible_for_the_team to false
      for (const belongsId of memberToRemoveResponsible.belongsIds) {
        const { error } = await supabase
          .from('belongs')
          .update({ is_responsible_for_the_team: false })
          .eq('id', belongsId);

        if (error) throw error;
      }

      toast.success('Responsabilidad removida');
      if (onDelete) onDelete();
    } catch (error) {
      console.error('Error removing responsible:', error);
      toast.error(friendlyError(error, 'Error al quitar la responsabilidad'));
    } finally {
      setRemovingResponsibleId(null);
      setMemberToRemoveResponsible(null);
    }
  };

  const handleAssignResponsible = async () => {
    if (!memberToAssignResponsible) return;
    setAssigningResponsibleId(memberToAssignResponsible.id);
    try {
      const supabase = createClient();

      // Primero, quitar la responsabilidad de todos los demás miembros del equipo
      if (hasResponsible) {
        const { data: currentResponsibles, error: fetchError } = await supabase
          .from('belongs')
          .select('id')
          .eq('team_id', team.id)
          .eq('is_responsible_for_the_team', true);

        if (fetchError) throw fetchError;

        if (currentResponsibles && currentResponsibles.length > 0) {
          const responsibleIds = currentResponsibles.map(r => r.id);
          const { error: updateError } = await supabase
            .from('belongs')
            .update({ is_responsible_for_the_team: false })
            .in('id', responsibleIds);

          if (updateError) throw updateError;
        }
      }

      // Luego, asignar la responsabilidad al nuevo miembro
      for (const belongsId of memberToAssignResponsible.belongsIds) {
        const { error } = await supabase
          .from('belongs')
          .update({ is_responsible_for_the_team: true })
          .eq('id', belongsId);

        if (error) throw error;
      }

      toast.success('Responsabilidad asignada');
      if (onDelete) onDelete();
    } catch (error) {
      console.error('Error assigning responsible:', error);
      toast.error(friendlyError(error, 'Error al asignar la responsabilidad'));
    } finally {
      setAssigningResponsibleId(null);
      setMemberToAssignResponsible(null);
    }
  };

  const getTeamTitle = () => {
    if (team.team_type_id === 4) {
      return 'Equipo de Responsables';
    } else if (team.team_type_id === 3) {
      return teamNumber ? `Equipo de Catequistas ${teamNumber}` : 'Equipo de Catequistas';
    }
    return team.name;
  };

  const handleDeleteTeam = async () => {
    setShowDeleteTeamDialog(false);
    setDeletingTeam(true);
    try {
      const supabase = createClient();

      // 1. Eliminar todos los registros de belongs asociados al equipo
      const { error: belongsError } = await supabase
        .from('belongs')
        .delete()
        .eq('team_id', team.id);

      if (belongsError) throw belongsError;

      // 2. Eliminar todos los registros de parish_teams asociados al equipo
      const { error: parishTeamsError } = await supabase
        .from('parish_teams')
        .delete()
        .eq('team_id', team.id);

      if (parishTeamsError) throw parishTeamsError;

      // 3. Eliminar el equipo
      const { error: teamError, count: teamCount } = await supabase
        .from('teams')
        .delete({ count: 'exact' })
        .eq('id', team.id);

      if (teamError) throw teamError;
      if (teamCount === 0) {
        throw new Error('No se pudo eliminar el equipo. Es posible que no tengas permisos.');
      }

      toast.success('Equipo eliminado correctamente');
      // Refresh the community data
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error('Error al eliminar el equipo');
    } finally {
      setDeletingTeam(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{getTeamTitle()}</CardTitle>
          <div className="flex items-center gap-2 print-hidden">
            {onAddMember && (
              <Button
                variant="outline"
                onClick={onAddMember}
                disabled={deletingTeam || deletingId !== null}
                title="Agregar miembro al equipo"
              >
                <UserPlus className="h-4 w-4" />
                Agregar
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                className="text-destructive border-destructive/50 hover:bg-destructive/10"
                onClick={() => setShowDeleteTeamDialog(true)}
                disabled={deletingTeam || deletingId !== null || removingResponsibleId !== null || assigningResponsibleId !== null}
                title="Eliminar equipo completo"
              >
                <Trash2 className="h-4 w-4" />
                {deletingTeam ? 'Eliminando...' : 'Eliminar Equipo'}
              </Button>
            )}
          </div>
        </div>
        {team.team_type_id === 3 && parishes.length > 0 && (
          <div className="mt-2">
            <div className="space-y-1">
              {parishes.map((parish) => (
                <p key={parish.id} className="text-sm text-gray-600">
                  Lleva {parish.name}
                </p>
              ))}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Celular</TableHead>
                {onDelete && <TableHead className="print-hidden">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {mergedMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                    No hay miembros en este equipo
                  </TableCell>
                </TableRow>
              ) : (
                mergedMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.name}
                      {team.team_type_id === 3 ? (
                        <>
                          {member.isResponsible && (
                            <span className="ml-2 text-xs font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded inline-flex items-center gap-1">
                              <Crown className="w-4 h-4" />
                              Responsable
                            </span>
                          )}
                          {member.carisma && member.carisma !== 'Matrimonio' && (
                            <CarismaBadge carisma={member.carisma} className="ml-2" />
                          )}
                        </>
                      ) : (
                        <>
                          {member.isResponsible ? (
                            <span className="ml-2 text-xs font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded inline-flex items-center gap-1">
                              <Crown className="w-4 h-4" />
                              Responsable
                            </span>
                          ) : (
                            <span className="ml-2 text-xs font-semibold bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                              Corresponsable
                            </span>
                          )}
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.mobile || '-'}
                    </TableCell>
                    {onDelete && (
                      <TableCell className="print-hidden">
                        <div className="flex gap-2">
                          {onEditMember && (
                            <Button
                              variant="outline"
                              onClick={() => onEditMember(member.personIds[0])}
                              disabled={deletingId === member.id || removingResponsibleId === member.id || assigningResponsibleId === member.id}
                              title="Editar persona"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {member.isResponsible ? (
                            <Button
                              variant="outline"
                              className="text-orange-500 border-orange-300 hover:bg-orange-50"
                              onClick={() => setMemberToRemoveResponsible(member)}
                              disabled={removingResponsibleId === member.id || deletingId === member.id || assigningResponsibleId === member.id}
                              title="Quitar responsabilidad (la persona permanecerá en el equipo)"
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              className="text-green-600 border-green-300 hover:bg-green-50"
                              onClick={() => setMemberToAssignResponsible(member)}
                              disabled={hasResponsible || assigningResponsibleId === member.id || deletingId === member.id || removingResponsibleId === member.id}
                              title={hasResponsible ? "Ya existe un responsable en el equipo. Quita la responsabilidad del actual para asignar a otro." : "Asignar responsabilidad"}
                            >
                              <Crown className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            className="text-destructive border-destructive/50 hover:bg-destructive/10"
                            onClick={() => setMemberToDelete(member)}
                            disabled={deletingId === member.id || removingResponsibleId === member.id || assigningResponsibleId === member.id}
                            title="Eliminar miembro del equipo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Diálogo de confirmación para eliminar equipo */}
      <ConfirmDeleteDialog
        open={showDeleteTeamDialog}
        onClose={() => setShowDeleteTeamDialog(false)}
        onConfirm={handleDeleteTeam}
        title="¿Eliminar equipo?"
        itemName={getTeamTitle()}
        description="¿Estás seguro de que deseas eliminar este equipo? Se eliminarán todos los miembros."
        preview={[
          `${mergedMembers.length} miembro(s) del equipo`,
          ...(parishes.length > 0 ? [`${parishes.length} parroquia(s) asignada(s)`] : []),
        ]}
        loading={deletingTeam}
      />

      {/* Diálogo de confirmación para eliminar miembro */}
      <ConfirmDeleteDialog
        open={memberToDelete !== null}
        onClose={() => setMemberToDelete(null)}
        onConfirm={handleDeleteMember}
        title="¿Eliminar miembro del equipo?"
        itemName={memberToDelete?.name}
        description="¿Estás seguro de que deseas eliminar a este miembro del equipo?"
        loading={deletingId !== null}
      />

      {/* Diálogo de confirmación para quitar responsabilidad */}
      <Dialog open={memberToRemoveResponsible !== null} onOpenChange={(isOpen) => !isOpen && setMemberToRemoveResponsible(null)}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Quitar responsabilidad?</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas quitar la responsabilidad a {memberToRemoveResponsible?.name}? La persona permanecerá en el equipo como corresponsable.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-3">
              <Button
                variant="outline"
                onClick={() => setMemberToRemoveResponsible(null)}
                disabled={removingResponsibleId !== null}
              >
                Cancelar
              </Button>
              <Button
                variant="warning"
                onClick={handleRemoveResponsible}
                disabled={removingResponsibleId !== null}
              >
                {removingResponsibleId ? 'Quitando...' : 'Quitar Responsabilidad'}
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para asignar responsabilidad */}
      <Dialog open={memberToAssignResponsible !== null} onOpenChange={(isOpen) => !isOpen && setMemberToAssignResponsible(null)}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Asignar responsabilidad?</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas asignar la responsabilidad a {memberToAssignResponsible?.name}?
                {hasResponsible && ' Esto quitará la responsabilidad del responsable actual.'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-3">
              <Button
                variant="outline"
                onClick={() => setMemberToAssignResponsible(null)}
                disabled={assigningResponsibleId !== null}
              >
                Cancelar
              </Button>
              <Button
                variant="success"
                onClick={handleAssignResponsible}
                disabled={assigningResponsibleId !== null}
              >
                {assigningResponsibleId ? 'Asignando...' : 'Asignar Responsabilidad'}
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}