import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { FEATURE_FLAGS, FeatureFlagDefinition } from '@/config/featureFlags';
import { createClient } from '@/utils/supabase/client';

/**
 * Check if the current user's person_id is marked as responsible
 * for at least one catechist team (team_type_id = 3).
 */
function useIsCatechistTeamResponsible(): boolean {
  const { userScope } = useAuth();
  const personId = userScope?.person_id ?? null;

  const { data } = useQuery({
    queryKey: ['eligibility', 'catechistTeamResponsible', personId],
    queryFn: async () => {
      if (!personId) return false;
      const supabase = createClient();
      const { count, error } = await supabase
        .from('belongs')
        .select('id, team:teams!inner(team_type_id)', { count: 'exact', head: true })
        .eq('person_id', personId)
        .eq('is_responsible_for_the_team', true)
        .eq('team.team_type_id', 3);

      if (error) {
        console.error('Error checking catechist team eligibility:', error);
        return false;
      }
      return (count ?? 0) > 0;
    },
    enabled: personId !== null,
    staleTime: 5 * 60 * 1000,
  });

  return data ?? false;
}

export function useFeatureFlags() {
  const { user, featureFlags, setFeatureFlags } = useAuth();
  const isCatechistResponsible = useIsCatechistTeamResponsible();

  const { userScope } = useAuth();
  const isPrivilegedRole = userScope?.role === 'admin' || userScope?.role === 'contributor';

  const eligibilityMap: Record<string, boolean> = useMemo(
    () => ({
      catechist_team_responsible: isPrivilegedRole || isCatechistResponsible,
    }),
    [isPrivilegedRole, isCatechistResponsible]
  );

  const checkEligibility = useCallback(
    (flag: FeatureFlagDefinition): boolean => {
      if (!flag.eligibility) return true;
      return eligibilityMap[flag.eligibility] ?? false;
    },
    [eligibilityMap]
  );

  const availableFlags = useMemo<FeatureFlagDefinition[]>(
    () => FEATURE_FLAGS.filter(checkEligibility),
    [checkEligibility]
  );

  const isEnabled = useCallback(
    (key: string): boolean => {
      const def = FEATURE_FLAGS.find((f) => f.key === key);
      if (!def) return false;
      if (!checkEligibility(def)) return false;
      // User override takes precedence, then default
      if (featureFlags && key in featureFlags) {
        return featureFlags[key];
      }
      return def.defaultEnabled;
    },
    [featureFlags, checkEligibility]
  );

  const toggleFlag = useCallback(
    async (key: string) => {
      if (!user) return;
      const current = isEnabled(key);
      const newValue = !current;
      const newFlags = { ...featureFlags, [key]: newValue };

      // Optimistic update
      setFeatureFlags(newFlags);

      try {
        const supabase = createClient();
        const { error } = await supabase
          .from('profiles')
          .update({ feature_flags: newFlags })
          .eq('id', user.id);

        if (error) {
          setFeatureFlags(featureFlags || {});
          console.error('Error updating feature flags:', error);
        }
      } catch {
        setFeatureFlags(featureFlags || {});
      }
    },
    [user, featureFlags, isEnabled, setFeatureFlags]
  );

  return { availableFlags, isEnabled, toggleFlag };
}

export function useFeatureFlag(key: string): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(key);
}
