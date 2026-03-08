import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import type { AppRole } from "@/lib/permissions";

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: AppRole;
  person_id: number | null;
  zone_id: number | null;
  community_id: number | null;
  created_at: string;
  last_sign_in_at: string | null;
}

async function fetchAdminUsers(): Promise<AdminUser[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_admin_users_list");

  if (error) throw error;
  return (data as AdminUser[]) ?? [];
}

export interface UpdateRoleParams {
  targetUserId: string;
  newRole: AppRole;
  personId?: number | null;
  zoneId?: number | null;
  communityId?: number | null;
}

export interface CreateUserParams {
  email: string;
  password: string;
  fullName?: string;
  role: AppRole;
  zoneId?: number | null;
  communityId?: number | null;
}

export function useAdminUsers(enabled = true) {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.admin.users(),
    queryFn: fetchAdminUsers,
    enabled,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (params: UpdateRoleParams) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("set_user_role", {
        target_user_id: params.targetUserId,
        new_role: params.newRole,
        new_person_id: params.personId ?? null,
        new_zone_id: params.zoneId ?? null,
        new_community_id: params.communityId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (params: CreateUserParams) => {
      // Use a temporary client with persistSession: false so the admin's
      // session is not replaced by the newly created user's session.
      const tempClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
        { auth: { persistSession: false } },
      );

      const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
          data: { full_name: params.fullName || "" },
        },
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("No se pudo crear el usuario");

      // Now use the admin's own session to assign role & scope
      const adminClient = createClient();
      const { error: roleError } = await adminClient.rpc("set_user_role", {
        target_user_id: signUpData.user.id,
        new_role: params.role,
        new_person_id: null,
        new_zone_id: params.zoneId ?? null,
        new_community_id: params.communityId ?? null,
      });

      if (roleError) throw roleError;
      return signUpData.user.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
  });

  return {
    users: data ?? [],
    loading: isLoading,
    error,
    updateRole: updateRoleMutation.mutate,
    isUpdatingRole: updateRoleMutation.isPending,
    createUser: createUserMutation.mutate,
    isCreatingUser: createUserMutation.isPending,
  };
}
