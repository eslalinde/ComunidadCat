'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useCommunityData } from '@/hooks/useCommunityData';
import { CommunityInfo } from '@/components/crud/CommunityInfo';
import { BrothersList } from '@/components/crud/BrothersList';
import { TeamSection } from '@/components/crud/TeamSection';
import { CommunityStepLogCompact } from '@/components/crud/CommunityStepLogCompact';
import { CommunityPrintView } from '@/components/crud/CommunityPrintView';
import { DynamicEntityModal } from '@/components/crud/DynamicEntityModal';
import { communityConfig } from '@/config/entities';
import { SelectBrotherForTeamModal } from '@/components/crud/SelectBrotherForTeamModal';
import { EditPersonModal } from '@/components/crud/EditPersonModal';
import { Button } from '@/components/ui/button';
import { MergeCommunityModal } from '@/components/crud/MergeCommunityModal';
import { ConfirmDeleteDialog } from '@/components/crud/ConfirmDeleteDialog';
import { AuditLogSheet } from '@/components/crud/AuditLogSheet';
import { ArrowLeft, ChevronDown, History, Merge, MoreHorizontal, Plus, Printer, Trash2, Users } from 'lucide-react';
import { friendlyError } from '@/lib/supabaseErrors';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PrintMode } from '@/components/crud/CommunityPrintView';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { Community } from '@/types/database';
import { routes } from '@/lib/routes';
import { createCatequistasTeam, createResponsablesTeam } from '@/lib/communityTeams';
import { useAuth } from '@/contexts/AuthContext';
import {
  canEditCommunity,
  canDeleteCommunity,
  canMergeCommunity,
  canManageBrothers,
  canManageTeams,
  canViewAuditLog,
  canViewStepLog,
  canPrintFicha,
  canPrintHermanos,
  canPrintTodo,
  canManageCommunityAccess,
  canEditStepLog,
} from '@/lib/permissions';
import { CommunityAccessSection } from '@/components/crud/CommunityAccessSection';
import { CommunityVisits } from '@/components/crud/CommunityVisits';
import { CommunityInventory } from '@/components/crud/CommunityInventory';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

function CommunityDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const communityId = parseInt(searchParams.get('id') as string);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [addToTeamId, setAddToTeamId] = useState<number | null>(null);
  const [editPersonIds, setEditPersonIds] = useState<number[] | null>(null);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>('todo');

  const { userScope } = useAuth();

  // Permission flags
  const showEdit = canEditCommunity(userScope);
  const showDelete = canDeleteCommunity(userScope);
  const showMerge = canMergeCommunity(userScope);
  const showManageBrothers = canManageBrothers(userScope);
  const showManageTeams = canManageTeams(userScope);
  const showAuditLog = canViewAuditLog(userScope);
  const showStepLog = canViewStepLog(userScope);
  const showPrintFicha = canPrintFicha(userScope);
  const showPrintHermanos = canPrintHermanos(userScope);
  const showPrintTodo = canPrintTodo(userScope);
  const showAnyPrint = showPrintFicha || showPrintHermanos || showPrintTodo;
  const showCommunityAccess = canManageCommunityAccess(userScope);
  const [isAccessOpen, setIsAccessOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const showVisits = useFeatureFlag('community_visits');
  const showInventory = useFeatureFlag('community_inventory');

  const handlePrint = (mode: PrintMode) => {
    setPrintMode(mode);
    setTimeout(() => window.print(), 0);
  };

  const {
    community,
    brothers,
    mergedBrothers,
    teams,
    teamMembers,
    teamParishes,
    stepLogs,
    parishPriestName,
    loading,
    error,
    refreshCommunity,
    invalidateDetail,
    invalidateTeams,
    invalidateTeamMembers,
    invalidateBrothers,
    invalidateStepLogs,
  } = useCommunityData(communityId);

  // Construir nombre de catequistas responsables del equipo por defecto
  // Incluye el nombre del responsable y su cónyuge si aplica
  const defaultCatechistName = useMemo(() => {
    const team = community?.cathechist_team as any;
    if (!team?.belongs) return '';
    const names: string[] = [];
    const seen = new Set<string>();
    team.belongs
      .filter((b: any) => b.is_responsible_for_the_team)
      .forEach((b: any) => {
        const name = b.person?.person_name;
        if (name && !seen.has(name)) {
          seen.add(name);
          names.push(name);
        }
        const spouseName = b.person?.spouse?.person_name;
        if (spouseName && !seen.has(spouseName)) {
          seen.add(spouseName);
          names.push(spouseName);
        }
      });
    return names.join(' y ');
  }, [community?.cathechist_team]);

  const communityEditInitial = useMemo(() => {
    if (!community) return null;

    return {
      ...community,
      // Keep FK values available even when the detail payload only has nested relations.
      step_way_id: community.step_way_id ?? community.step_way?.id,
      cathechist_team_id:
        community.cathechist_team_id ?? community.cathechist_team?.id,
    };
  }, [community]);

  // The step log is the single way to advance a stage, so the history stays
  // complete. The edit form only keeps the stage fields when the user cannot
  // record step log entries.
  const stageFromStepLog = showStepLog && canEditStepLog(userScope);
  const communityEditFields = useMemo(
    () =>
      stageFromStepLog
        ? communityConfig.fields.filter(
            (f) => f.name !== 'step_way_id' && f.name !== 'last_step_way_date'
          )
        : communityConfig.fields,
    [stageFromStepLog]
  );

  const canShowMerge = showMerge && !!community?.parish_id;
  const showMoreMenu = showCommunityAccess || showAuditLog || canShowMerge || showDelete;

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleSave = async (data: Omit<Community, 'id' | 'created_at' | 'updated_at'>) => {
    if (!community?.id) return;

    const safeData: Omit<Community, 'id' | 'created_at' | 'updated_at'> = {
      ...data,
      // Defensive fallback: avoid nulling these fields when select options fail to hydrate.
      step_way_id: data.step_way_id ?? community.step_way_id ?? community.step_way?.id,
      cathechist_team_id:
        data.cathechist_team_id ??
        community.cathechist_team_id ??
        community.cathechist_team?.id,
    };

    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: updatedRows, error: updateError } = await supabase
        .from('communities')
        .update(safeData)
        .eq('id', community.id)
        .select();

      if (updateError) throw updateError;

      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('No tienes permisos para editar comunidades. Contacta al administrador para que te asigne el rol de contributor o admin.');
      }

      toast.success('Comunidad actualizada');
      // Refrescar solo el detalle de la comunidad
      await invalidateDetail();
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error updating community:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateResponsablesTeam = async () => {
    if (!community?.id) return;

    try {
      await createResponsablesTeam({ id: community.id, number: community.number });
      toast.success('Equipo de responsables creado');
      await invalidateTeams();
    } catch (err) {
      console.error('Error creating responsables team:', err);
      toast.error('Error al crear el equipo de responsables');
    }
  };

  const handleCreateCatequistasTeam = async () => {
    if (!community?.id) return;

    try {
      await createCatequistasTeam(
        { id: community.id, number: community.number },
        teams.catequistas.length
      );
      toast.success('Equipo de catequistas creado');
      await invalidateTeams();
    } catch (err) {
      console.error('Error creating catequistas team:', err);
      toast.error('Error al crear el equipo de catequistas');
    }
  };

  const handleDeleteCommunity = async () => {
    if (!community?.id) return;
    setIsDeleting(true);
    try {
      const supabase = createClient();

      // Delete in order: belongs → brothers → teams → community_step_log → community
      // 1. Get all team IDs for this community
      const { data: communityTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('community_id', community.id);
      const teamIds = communityTeams?.map(t => t.id) || [];

      if (teamIds.length > 0) {
        // 2. Delete belongs records for those teams
        const { error: belongsError } = await supabase
          .from('belongs')
          .delete()
          .in('team_id', teamIds);
        if (belongsError) throw belongsError;

        // 3. Delete parish_teams records for those teams
        const { error: parishTeamsError } = await supabase
          .from('parish_teams')
          .delete()
          .in('team_id', teamIds);
        if (parishTeamsError) throw parishTeamsError;

        // 4. Delete teams
        const { error: teamsError } = await supabase
          .from('teams')
          .delete()
          .eq('community_id', community.id);
        if (teamsError) throw teamsError;
      }

      // 5. Delete brothers
      const { error: brothersError } = await supabase
        .from('brothers')
        .delete()
        .eq('community_id', community.id);
      if (brothersError) throw brothersError;

      // 6. Delete community step logs
      const { error: logsError } = await supabase
        .from('community_step_log')
        .delete()
        .eq('community_id', community.id);
      if (logsError) throw logsError;

      // 7. Delete the community itself
      const { error: communityError, count } = await supabase
        .from('communities')
        .delete({ count: 'exact' })
        .eq('id', community.id);
      if (communityError) throw communityError;
      if (count === 0) {
        throw new Error('No se pudo eliminar la comunidad. Es posible que no tengas permisos.');
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.crud.table('communities') });
      toast.success('Comunidad eliminada correctamente');
      router.push(routes.comunidades);
    } catch (err: any) {
      console.error('Error deleting community:', err);
      toast.error(friendlyError(err, 'Error al eliminar la comunidad'));
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleAddBrotherToTeam = async (personIds: number[]) => {
    if (!addToTeamId || personIds.length === 0) return;
    const supabase = createClient();

    // Skip people already in the team (e.g. one spouse of a marriage) and insert in one call.
    const existing = new Set((teamMembers[addToTeamId] || []).map((m) => m.person_id));
    const rows = personIds
      .filter((personId) => !existing.has(personId))
      .map((personId) => ({
        person_id: personId,
        team_id: addToTeamId,
        community_id: communityId,
        is_responsible_for_the_team: false,
      }));

    if (rows.length > 0) {
      const { error } = await supabase.from('belongs').insert(rows);
      if (error) throw error;
    }

    toast.success('Miembros agregados al equipo');
    await invalidateTeamMembers();
  };

  const handlePersonUpdated = async () => {
    await Promise.all([invalidateBrothers(), invalidateTeamMembers(), invalidateDetail()]);
  };

  const handleEditMember = showManageTeams
    ? (_personId: number, personIds: number[]) => setEditPersonIds(personIds)
    : undefined;

  if (error) {
    return (
      <div className="container mx-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6">
      {/* Screen view - hidden when printing */}
      <div className="print:hidden">
        {/* Header */}
        <div className="mb-6 space-y-3">
          <Button
            variant="ghost"
            onClick={() => router.push(routes.comunidades)}
            className="-ml-2 flex items-center gap-2 text-muted-foreground"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Regresar a Comunidades
          </Button>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground">
                Comunidad {community?.number || 'Cargando...'}
              </h1>
              <p className="mt-1 text-muted-foreground">
                {community?.parish?.name || 'Parroquia no especificada'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {showAnyPrint && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2" size="sm" aria-label="Imprimir">
                      <Printer className="h-4 w-4" />
                      <span className="hidden sm:inline">Imprimir</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {showPrintFicha && (
                      <DropdownMenuItem onClick={() => handlePrint('ficha')}>
                        Ficha completa
                      </DropdownMenuItem>
                    )}
                    {showPrintHermanos && (
                      <DropdownMenuItem onClick={() => handlePrint('hermanos')}>
                        Lista de hermanos
                      </DropdownMenuItem>
                    )}
                    {showPrintTodo && (
                      <DropdownMenuItem onClick={() => handlePrint('todo')}>
                        Todo
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {showMoreMenu && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2" size="sm" aria-label="Más acciones">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="hidden sm:inline">Más</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-48">
                    {showCommunityAccess && (
                      <DropdownMenuItem onClick={() => setIsAccessOpen(true)}>
                        <Users className="h-4 w-4" />
                        Usuarios con acceso
                      </DropdownMenuItem>
                    )}
                    {showAuditLog && (
                      <DropdownMenuItem onClick={() => setIsAuditOpen(true)}>
                        <History className="h-4 w-4" />
                        Historial de cambios
                      </DropdownMenuItem>
                    )}
                    {canShowMerge && (
                      <DropdownMenuItem onClick={() => setIsMergeModalOpen(true)}>
                        <Merge className="h-4 w-4" />
                        Fusionar
                      </DropdownMenuItem>
                    )}
                    {showDelete && (
                      <>
                        {(showCommunityAccess || showAuditLog || canShowMerge) && <DropdownMenuSeparator />}
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setIsDeleteDialogOpen(true)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          {showCommunityAccess && (
            <CommunityAccessSection
              communityId={communityId}
              open={isAccessOpen}
              onOpenChange={setIsAccessOpen}
              hideTrigger
            />
          )}
          {showAuditLog && (
            <AuditLogSheet
              communityId={communityId}
              open={isAuditOpen}
              onOpenChange={setIsAuditOpen}
              hideTrigger
            />
          )}
        </div>

        {/* Main Content - 50/50 Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left: Community Info + Teams */}
          <div className="space-y-6">
            <CommunityInfo
              community={community}
              loading={loading}
              onEdit={showEdit ? handleEdit : undefined}
              brothersInList={mergedBrothers.reduce((n, b) => n + b.personIds.length, 0)}
              stageFromStepLog={stageFromStepLog}
            />

            {/* Responsables Team */}
            <div>
              {teams.responsables.length > 0 ? (
                teams.responsables.map((team, index) => (
                  <div key={team.id || `responsable-${index}`}>
                    <TeamSection
                      team={team}
                      members={team.id ? teamMembers[team.id] || [] : []}
                      parishes={team.id ? teamParishes[team.id] || [] : []}
                      loading={loading}
                      communityId={communityId}
                      onDelete={showManageTeams ? async () => { await invalidateTeams(); await invalidateTeamMembers(); } : undefined}
                      onAddMember={showManageTeams ? () => setAddToTeamId(team.id!) : undefined}
                      onEditMember={handleEditMember}
                    />
                  </div>
                ))
              ) : showManageTeams ? (
                <EmptyTeamRow
                  title="No hay equipo de responsables"
                  hint="Créalo para asignar al responsable y los corresponsables."
                  actionLabel="Crear Equipo de Responsables"
                  onAction={handleCreateResponsablesTeam}
                  disabled={loading}
                />
              ) : (
                <EmptyTeamRow title="No hay equipo de responsables" />
              )}
            </div>

            {/* Catequistas Teams */}
            <div className="space-y-4">
              {teams.catequistas.length > 0 ? (
                <>
                  {teams.catequistas.map((team, index) => (
                    <div key={team.id || `catequista-${index}`}>
                      <TeamSection
                        team={team}
                        members={team.id ? teamMembers[team.id] || [] : []}
                        parishes={team.id ? teamParishes[team.id] || [] : []}
                        loading={loading}
                        teamNumber={index + 1}
                        communityId={communityId}
                        onDelete={showManageTeams ? async () => { await invalidateTeams(); await invalidateTeamMembers(); } : undefined}
                        onAddMember={showManageTeams ? () => setAddToTeamId(team.id!) : undefined}
                        onEditMember={handleEditMember}
                      />
                    </div>
                  ))}
                  {showManageTeams && (
                    <div className="flex justify-center pt-2">
                      <Button
                        onClick={handleCreateCatequistasTeam}
                        variant="outline"
                        className="flex items-center gap-2"
                        disabled={loading}
                      >
                        <Plus className="h-4 w-4" />
                        Agregar Equipo de Catequistas
                      </Button>
                    </div>
                  )}
                </>
              ) : showManageTeams ? (
                <EmptyTeamRow
                  title="No hay equipos de catequistas"
                  hint="Crea el equipo que catequizará a la comunidad."
                  actionLabel="Crear Equipo de Catequistas"
                  onAction={handleCreateCatequistasTeam}
                  disabled={loading}
                />
              ) : (
                <EmptyTeamRow title="No hay equipos de catequistas" />
              )}
            </div>
          </div>

          {/* Right: Visits + Step Log + Brothers List */}
          <div className="space-y-6">
            {showVisits && (
              <CommunityVisits
                communityId={communityId}
                communityNumber={community?.number || ''}
                defaultVisitorName={defaultCatechistName}
              />
            )}

            {showInventory && (
              <CommunityInventory
                communityId={communityId}
                communityNumber={community?.number || ''}
              />
            )}

            {showStepLog && (
              <CommunityStepLogCompact
                communityId={communityId}
                communityNumber={community?.number || ''}
                stepLogs={stepLogs}
                loading={loading}
                onStepLogAdded={async () => { await invalidateStepLogs(); await invalidateDetail(); }}
                onStepLogDeleted={invalidateStepLogs}
                defaultCatechistName={defaultCatechistName}
                actualBrothers={community?.actual_brothers}
                readOnly={!canEditStepLog(userScope)}
              />
            )}

            <BrothersList
              brothers={mergedBrothers}
              loading={loading}
              communityId={communityId}
              communityNumber={community?.number || ''}
              teamMembers={teamMembers}
              onDelete={showManageBrothers ? invalidateBrothers : undefined}
              onAdd={showManageBrothers ? invalidateBrothers : undefined}
              onPersonUpdated={handlePersonUpdated}
            />
          </div>
        </div>
      </div>

      {/* Print view - only visible when printing */}
      <CommunityPrintView
        community={community}
        teams={teams}
        teamMembers={teamMembers}
        teamParishes={teamParishes}
        stepLogs={stepLogs}
        parishPriestName={parishPriestName}
        mergedBrothers={mergedBrothers}
        brothers={brothers}
        printMode={printMode}
      />

      {/* Modal de edición */}
      {showEdit && (
        <DynamicEntityModal
          key={`community-edit-${community?.id ?? 'none'}-${isEditModalOpen ? 'open' : 'closed'}`}
          open={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSave}
          initial={communityEditInitial}
          fields={communityEditFields}
          title="Editar Comunidad"
          loading={isSaving}
          size={communityConfig.formSize}
        />
      )}

      {/* Modal para agregar hermano a equipo */}
      {showManageTeams && (
        <SelectBrotherForTeamModal
          open={addToTeamId !== null}
          onClose={() => setAddToTeamId(null)}
          onSelect={handleAddBrotherToTeam}
          brothers={mergedBrothers}
          teamMembers={addToTeamId ? teamMembers[addToTeamId] || [] : []}
        />
      )}

      {/* Modal para editar datos de un miembro de equipo */}
      <EditPersonModal
        personIds={editPersonIds}
        onClose={() => setEditPersonIds(null)}
        onSaved={handlePersonUpdated}
      />

      {/* Diálogo de confirmación de eliminación */}
      {showDelete && (
        <ConfirmDeleteDialog
          open={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDeleteCommunity}
          title="¿Eliminar comunidad?"
          itemName={`Comunidad ${community?.number || ''}`}
          description="¿Estás seguro de que deseas eliminar esta comunidad? Se eliminarán todos los datos asociados."
          preview={[
            `${mergedBrothers.length} hermano(s)`,
            `${teams.responsables.length + teams.catequistas.length} equipo(s)`,
            `${stepLogs.length} registro(s) de bitácora`,
          ]}
          loading={isDeleting}
        />
      )}

      {/* Modal de fusión de comunidades */}
      {showMerge && community?.parish_id && (
        <MergeCommunityModal
          open={isMergeModalOpen}
          onClose={() => setIsMergeModalOpen(false)}
          keepCommunityId={communityId}
          keepCommunityNumber={community.number || ''}
          parishId={community.parish_id}
          onSuccess={refreshCommunity}
        />
      )}
    </div>
  );
}

function EmptyTeamRow({
  title,
  hint,
  actionLabel,
  onAction,
  disabled,
}: {
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-foreground">{title}</p>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} disabled={disabled} className="shrink-0">
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default function CommunityDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A6F]"></div>
        </div>
      }
    >
      <CommunityDetailContent />
    </Suspense>
  );
}
