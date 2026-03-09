import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { Community, Brother, Team, Belongs, Parish, CommunityStepLog } from '@/types/database';
import { NON_MARRIAGE_TYPE_IDS, getCarismaLabel } from '@/config/carisma';
import { queryKeys } from '@/lib/queryKeys';
import { SupabaseClient } from '@supabase/supabase-js';

export interface CommunityData {
  community: Community | null;
  brothers: Brother[];
  teams: {
    responsables: Team[];
    catequistas: Team[];
  };
  teamMembers: Record<number, Belongs[]>;
  teamParishes: Record<number, Parish[]>;
  stepLogs: CommunityStepLog[];
  parishPriestName: string | null;
  loading: boolean;
  error: string | null;
}

export interface MergedBrother {
  id: string;
  name: string;
  carisma: string;
  celular: string;
  isMarriage: boolean;
  isPresbitero: boolean;
  isItinerante: boolean;
  personIds: number[];
}

// --- Fetcher functions ---

async function fetchCommunity(supabase: SupabaseClient, communityId: number) {
  const { data, error } = await supabase
    .from('communities')
    .select(`
      *,
      parish:parishes(*),
      step_way:step_ways(*),
      cathechist_team:teams!cathechist_team_id(
        *,
        belongs(
          is_responsible_for_the_team,
          person:people(person_name, spouse:people!spouse_id(person_name))
        ),
        parish_teams(
          parish:parishes(name)
        )
      )
    `)
    .eq('id', communityId)
    .single();

  if (error) throw error;
  return data as Community;
}

async function fetchBrothers(supabase: SupabaseClient, communityId: number) {
  const { data, error } = await supabase
    .from('brothers')
    .select(`
      *,
      person:people(*)
    `)
    .eq('community_id', communityId);

  if (error) throw error;
  return (data || []) as Brother[];
}

async function fetchTeams(supabase: SupabaseClient, communityId: number) {
  const { data, error } = await supabase
    .from('teams')
    .select(`
      *,
      team_type:team_types(*)
    `)
    .eq('community_id', communityId);

  if (error) throw error;
  return (data || []) as Team[];
}

async function fetchTeamMembers(supabase: SupabaseClient, teamIds: number[]) {
  const { data, error } = await supabase
    .from('belongs')
    .select(`
      *,
      person:people(*)
    `)
    .in('team_id', teamIds);

  if (error) throw error;

  // Group by team_id
  const membersByTeam: Record<number, Belongs[]> = {};
  (data || []).forEach((member: Belongs) => {
    if (!membersByTeam[member.team_id]) {
      membersByTeam[member.team_id] = [];
    }
    membersByTeam[member.team_id].push(member);
  });
  return membersByTeam;
}

async function fetchTeamParishes(supabase: SupabaseClient, teamIds: number[]) {
  const { data, error } = await supabase
    .from('parish_teams')
    .select(`
      team_id,
      parish:parishes(*)
    `)
    .in('team_id', teamIds);

  if (error) throw error;

  // Group by team_id
  const parishesByTeam: Record<number, Parish[]> = {};
  (data || []).forEach((item: any) => {
    if (!parishesByTeam[item.team_id]) {
      parishesByTeam[item.team_id] = [];
    }
    if (item.parish) {
      parishesByTeam[item.team_id].push(item.parish as Parish);
    }
  });
  return parishesByTeam;
}

async function fetchStepLogs(supabase: SupabaseClient, communityId: number) {
  const { data, error } = await supabase
    .from('community_step_log')
    .select(`
      *,
      step_way:step_ways(*)
    `)
    .eq('community_id', communityId)
    .order('id', { ascending: false });

  if (error) throw error;
  return (data || []) as CommunityStepLog[];
}

async function fetchParishPriest(supabase: SupabaseClient, parishId: number) {
  const { data } = await supabase
    .from('priests')
    .select('person:people(person_name)')
    .eq('parish_id', parishId)
    .eq('is_parish_priest', true)
    .limit(1)
    .maybeSingle();

  if (data?.person) {
    return (data.person as any).person_name as string | null;
  }
  return null;
}

// --- Hook ---

export function useCommunityData(communityId: number): CommunityData & {
  mergedBrothers: MergedBrother[];
  refreshCommunity: () => Promise<void>;
  invalidateDetail: () => Promise<void>;
  invalidateBrothers: () => Promise<void>;
  invalidateTeams: () => Promise<void>;
  invalidateTeamMembers: () => Promise<void>;
  invalidateStepLogs: () => Promise<void>;
} {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  // Query 1: Community base (needed for parish_id)
  const communityQuery = useQuery({
    queryKey: queryKeys.community.detail(communityId),
    queryFn: () => fetchCommunity(supabase, communityId),
    enabled: !!communityId,
  });

  // Parallel queries (don't depend on community)
  const brothersQuery = useQuery({
    queryKey: queryKeys.community.brothers(communityId),
    queryFn: () => fetchBrothers(supabase, communityId),
    enabled: !!communityId,
  });

  const teamsQuery = useQuery({
    queryKey: queryKeys.community.teams(communityId),
    queryFn: () => fetchTeams(supabase, communityId),
    enabled: !!communityId,
  });

  const stepLogsQuery = useQuery({
    queryKey: queryKeys.community.stepLogs(communityId),
    queryFn: () => fetchStepLogs(supabase, communityId),
    enabled: !!communityId,
  });

  // Dependent queries - need teamIds from teamsQuery
  const teamIds = useMemo(
    () => teamsQuery.data?.map(t => t.id!).filter(Boolean) ?? [],
    [teamsQuery.data]
  );

  const teamMembersQuery = useQuery({
    queryKey: queryKeys.community.teamMembers(communityId),
    queryFn: () => fetchTeamMembers(supabase, teamIds),
    enabled: teamIds.length > 0,
  });

  const teamParishesQuery = useQuery({
    queryKey: queryKeys.community.teamParishes(communityId),
    queryFn: () => fetchTeamParishes(supabase, teamIds),
    enabled: teamIds.length > 0,
  });

  // Dependent query - needs parish_id from communityQuery
  const parishId = communityQuery.data?.parish_id;

  const parishPriestQuery = useQuery({
    queryKey: queryKeys.community.parishPriest(parishId!),
    queryFn: () => fetchParishPriest(supabase, parishId!),
    enabled: !!parishId,
  });

  // Invalidation helpers
  const invalidateDetail = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.community.detail(communityId) }),
    [queryClient, communityId]
  );

  const invalidateBrothers = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.community.brothers(communityId) }),
    [queryClient, communityId]
  );

  const invalidateTeams = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.community.teams(communityId) }),
    [queryClient, communityId]
  );

  const invalidateTeamMembers = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.community.teamMembers(communityId) }),
    [queryClient, communityId]
  );

  const invalidateStepLogs = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.community.stepLogs(communityId) }),
    [queryClient, communityId]
  );

  const refreshCommunity = useCallback(
    async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.community.all });
    },
    [queryClient]
  );

  // Group teams by type
  const groupedTeams = useMemo(() => {
    const teams = teamsQuery.data ?? [];
    return {
      responsables: teams.filter(team => team.team_type_id === 4),
      catequistas: teams.filter(team => team.team_type_id === 3),
    };
  }, [teamsQuery.data]);

  // Merge married couples
  const mergedBrothers = useMemo(() => {
    const brothers = brothersQuery.data ?? [];
    const processedIds = new Set<number>();
    const merged: MergedBrother[] = [];

    const nonMarriageTypes = NON_MARRIAGE_TYPE_IDS;

    brothers.forEach(brother => {
      if (processedIds.has(brother.person_id)) return;

      const person = brother.person;
      if (!person) return;

      const cannotBeMarried = person.person_type_id && nonMarriageTypes.includes(person.person_type_id);

      if (!cannotBeMarried && person.spouse_id) {
        const spouseBrother = brothers.find(b =>
          b.person_id === person.spouse_id &&
          !processedIds.has(b.person_id)
        );

        if (spouseBrother && spouseBrother.person) {
          const spouseCannotBeMarried = spouseBrother.person.person_type_id &&
            nonMarriageTypes.includes(spouseBrother.person.person_type_id);

          if (!spouseCannotBeMarried) {
            const husband = person.gender_id === 1 ? person : spouseBrother.person;
            const wife = person.gender_id === 2 ? person : spouseBrother.person;

            merged.push({
              id: `marriage-${person.id}-${spouseBrother.person_id}`,
              name: `${husband.person_name} y ${wife.person_name}`,
              carisma: 'Matrimonio',
              celular: husband.mobile || wife.mobile || '',
              isMarriage: true,
              isPresbitero: false,
              isItinerante: person.is_itinerante === true || spouseBrother.person?.is_itinerante === true,
              personIds: [person.id!, spouseBrother.person_id]
            });

            processedIds.add(person.id!);
            processedIds.add(spouseBrother.person_id);
            return;
          }
        }
      }

      const carisma = getCarismaLabel(person.person_type_id);

      merged.push({
        id: `person-${person.id}`,
        name: person.person_name,
        carisma,
        celular: person.mobile || '',
        isMarriage: false,
        isPresbitero: person.person_type_id === 3,
        isItinerante: person.is_itinerante === true,
        personIds: [person.id!]
      });

      processedIds.add(person.id!);
    });

    return merged;
  }, [brothersQuery.data]);

  // Combine loading/error state
  const loading = communityQuery.isLoading || brothersQuery.isLoading || teamsQuery.isLoading || stepLogsQuery.isLoading;
  const error = communityQuery.error?.message
    ?? brothersQuery.error?.message
    ?? teamsQuery.error?.message
    ?? stepLogsQuery.error?.message
    ?? teamMembersQuery.error?.message
    ?? teamParishesQuery.error?.message
    ?? parishPriestQuery.error?.message
    ?? null;

  return {
    community: communityQuery.data ?? null,
    brothers: brothersQuery.data ?? [],
    teams: groupedTeams,
    teamMembers: teamMembersQuery.data ?? {},
    teamParishes: teamParishesQuery.data ?? {},
    stepLogs: stepLogsQuery.data ?? [],
    parishPriestName: parishPriestQuery.data ?? null,
    loading,
    error,
    mergedBrothers,
    refreshCommunity,
    invalidateDetail,
    invalidateBrothers,
    invalidateTeams,
    invalidateTeamMembers,
    invalidateStepLogs,
  };
}
