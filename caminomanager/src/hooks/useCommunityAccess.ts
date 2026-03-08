import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import type { AppRole } from "@/lib/permissions";

export interface CommunityAccessUser {
  user_id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  granted_by_name: string | null;
  created_at: string;
  source: "profile" | "grant";
}

export interface MyCommunityAccess {
  community_id: number;
  community_number: string;
  parish_name: string | null;
  granted_at: string;
}

export function useCommunityAccessUsers(communityId: number, enabled = true) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.communityAccess.community(communityId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_community_access_users", {
        p_community_id: communityId,
      });
      if (error) throw error;
      return (data as CommunityAccessUser[]) ?? [];
    },
    enabled,
  });

  const grantMutation = useMutation({
    mutationFn: async (userId: string) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("grant_community_access", {
        p_user_id: userId,
        p_community_id: communityId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.communityAccess.community(communityId) });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("revoke_community_access", {
        p_user_id: userId,
        p_community_id: communityId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.communityAccess.community(communityId) });
    },
  });

  return {
    accessUsers: data ?? [],
    loading: isLoading,
    error,
    grantAccess: grantMutation.mutate,
    revokeAccess: revokeMutation.mutate,
    isGranting: grantMutation.isPending,
    isRevoking: revokeMutation.isPending,
  };
}

export function useMyCommunitiesAccess() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.communityAccess.mine(),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_my_community_access");
      if (error) throw error;
      return (data as MyCommunityAccess[]) ?? [];
    },
  });

  return {
    communities: data ?? [],
    loading: isLoading,
    error,
  };
}
