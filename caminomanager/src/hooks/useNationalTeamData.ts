import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { Team, Belongs, Community } from '@/types/database';
import { friendlyError } from '@/lib/supabaseErrors';
import { queryKeys } from '@/lib/queryKeys';

export interface NationalTeamData {
  team: Team | null;
  members: Belongs[];
  communities: Community[];
  loading: boolean;
  error: string | null;
  refreshTeam: () => Promise<void>;
}

type TeamQueryData = Pick<NationalTeamData, 'team' | 'members' | 'communities'>;

export function useNationalTeamData(): NationalTeamData {
  const { data, isFetching, error, refetch } = useQuery<TeamQueryData>({
    queryKey: queryKeys.nationalTeam.all,
    queryFn: async () => {
      const supabase = createClient();
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*, team_type:team_types(*)')
        .is('community_id', null)
        .eq('team_type_id', 3)
        .maybeSingle();
      if (teamError) throw teamError;
      if (!team) {
        throw new Error('El equipo nacional de catequistas no existe. Contacta al administrador.');
      }

      const [membersResult, communitiesResult] = await Promise.all([
        supabase.from('belongs').select('*, person:people(*)').eq('team_id', team.id),
        supabase.from('communities')
          .select('*, parish:parishes(*), step_way:step_ways(*)')
          .eq('cathechist_team_id', team.id),
      ]);
      if (membersResult.error) throw membersResult.error;
      if (communitiesResult.error) throw communitiesResult.error;
      return {
        team,
        members: membersResult.data || [],
        communities: communitiesResult.data || [],
      };
    },
    staleTime: 60_000,
    gcTime: 300_000,
  });

  return {
    team: data?.team ?? null,
    members: data?.members ?? [],
    communities: data?.communities ?? [],
    loading: isFetching,
    error: error ? friendlyError(error, 'Error desconocido') : null,
    refreshTeam: async () => { await refetch(); },
  };
}
