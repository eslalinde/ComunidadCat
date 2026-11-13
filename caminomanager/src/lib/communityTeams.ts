import { createClient } from '@/utils/supabase/client';

// team_types rows seeded by migrations.
export const TEAM_TYPE_CATEQUISTAS = 3;
export const TEAM_TYPE_RESPONSABLES = 4;

interface CommunityRef {
  id: number;
  number?: string | null;
}

/** Creates the leaders team ("Equipo de Responsables") for a community. */
export async function createResponsablesTeam(community: CommunityRef): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('teams').insert({
    name: `Equipo de Responsables - Comunidad ${community.number ?? ''}`.trim(),
    team_type_id: TEAM_TYPE_RESPONSABLES,
    community_id: community.id,
  });
  if (error) throw error;
}

/** Creates the next catechists team, numbered after the existing ones. */
export async function createCatequistasTeam(
  community: CommunityRef,
  existingCount: number
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('teams').insert({
    name: `Equipo de Catequistas ${existingCount + 1} - Comunidad ${community.number ?? ''}`.trim(),
    team_type_id: TEAM_TYPE_CATEQUISTAS,
    community_id: community.id,
  });
  if (error) throw error;
}
