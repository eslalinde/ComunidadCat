'use client';

import { EditPersonModal } from '@/components/crud/EditPersonModal';
import { preparePerson } from '@/lib/personContacts';
import { useState, useMemo } from 'react';
import { useNationalTeamData } from '@/hooks/useNationalTeamData';
import { TeamSection } from '@/components/crud/TeamSection';
import { SelectPersonForTeamModal } from '@/components/crud/SelectPersonForTeamModal';
import { DynamicEntityModal } from '@/components/crud/DynamicEntityModal';
import { personConfig } from '@/config/entities';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, UserPlus, Users2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Person } from '@/types/database';
import { friendlyError } from '@/lib/supabaseErrors';
import Link from 'next/link';
import { routes } from '@/lib/routes';

export default function NationalTeamPage() {
  const { team, members, communities, loading, error, refreshTeam } = useNationalTeamData();

  const [isSelectPersonOpen, setIsSelectPersonOpen] = useState(false);
  const [isCreatePersonOpen, setIsCreatePersonOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // IDs of people already in the team (to exclude from selection)
  const excludePersonIds = useMemo(
    () => members.map((m) => m.person_id),
    [members]
  );

  const handleAddExistingPerson = async (personId: number) => {
    if (!team?.id) return;
    const supabase = createClient();

    const { error: insertError } = await supabase.from('belongs').insert({
      person_id: personId,
      team_id: team.id,
      community_id: null,
      is_responsible_for_the_team: false,
    });

    if (insertError) throw insertError;
    await refreshTeam();
  };

  const handleCreatePerson = async (data: Omit<Person, 'id' | 'created_at' | 'updated_at'>) => {
    if (!team?.id) return;
    setIsSaving(true);
    try {
      const supabase = createClient();

      // Clean empty strings to null for optional fields
      const cleanData = { ...data };
      for (const key of Object.keys(cleanData) as (keyof typeof cleanData)[]) {
        if (cleanData[key] === '') {
          (cleanData as any)[key] = null;
        }
      }

      // Create the person
      const { data: newPerson, error: personError } = await supabase
        .from('people')
        .insert(await preparePerson(supabase, cleanData))
        .select()
        .single();

      if (personError) {
        throw new Error(friendlyError(personError));
      }

      // Add person to the team
      const { error: belongsError } = await supabase.from('belongs').insert({
        person_id: newPerson.id,
        team_id: team.id,
        community_id: null,
        is_responsible_for_the_team: false,
      });

      if (belongsError) {
        throw new Error(friendlyError(belongsError));
      }

      await refreshTeam();
      setIsCreatePersonOpen(false);
    } catch (err: any) {
      console.error('Error creating person:', err?.message || JSON.stringify(err));
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditMember = (personId: number) => {
    const member = members.find(m => m.person_id === personId);
    if (member?.person) {
      setEditingPerson(member.person as Person);
    }
  };


  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Equipo de Catequistas de la Nación
        </h1>
        <p className="text-gray-600 mt-2">
          Equipo nacional que coordina las parroquias del camino neocatecumenal.
        </p>
      </div>

      {/* Main Content - 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Team Members */}
        <div className="space-y-4">
          {team ? (
            <TeamSection
              team={team}
              members={members}
              parishes={[]}
              loading={loading}
              communityId={null}
              onDelete={refreshTeam}
              onEditMember={handleEditMember}
            />
          ) : loading ? (
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
          ) : null}

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={() => setIsSelectPersonOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
              disabled={loading || !team}
            >
              <UserPlus className="h-4 w-4" />
              Agregar Persona Existente
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsCreatePersonOpen(true)}
              className="flex items-center gap-2"
              disabled={loading || !team}
            >
              <Plus className="h-4 w-4" />
              Crear Nueva Persona
            </Button>
          </div>
        </div>

        {/* Right: Communities */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users2 className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-lg">Comunidades que lleva</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
              ) : communities.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Este equipo no está asignado como catequista de ninguna comunidad.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Comunidad</TableHead>
                        <TableHead>Parroquia</TableHead>
                        <TableHead>Etapa</TableHead>
                        <TableHead>Hermanos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {communities.map((community) => (
                        <TableRow key={community.id}>
                          <TableCell>
                            <Link
                              href={routes.comunidad(community.id!)}
                              className="font-medium text-amber-700 hover:text-amber-900 hover:underline"
                            >
                              {community.number}
                            </Link>
                          </TableCell>
                          <TableCell>{community.parish?.name || '-'}</TableCell>
                          <TableCell>{community.step_way?.name || '-'}</TableCell>
                          <TableCell>{community.actual_brothers ?? '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <SelectPersonForTeamModal
        open={isSelectPersonOpen}
        onClose={() => setIsSelectPersonOpen(false)}
        onSelect={handleAddExistingPerson}
        excludePersonIds={excludePersonIds}
      />

      <DynamicEntityModal
        key={isCreatePersonOpen ? 'create-person-open' : 'create-person-closed'}
        open={isCreatePersonOpen}
        onClose={() => setIsCreatePersonOpen(false)}
        onSave={handleCreatePerson}
        fields={personConfig.fields}
        title="Crear Nueva Persona"
        loading={isSaving}
      />

      <EditPersonModal
        personIds={editingPerson?.id ? [editingPerson.id] : null}
        onClose={() => setEditingPerson(null)}
        onSaved={refreshTeam}
      />
    </div>
  );
}
