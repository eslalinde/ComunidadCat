'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { publicRoutes } from '@/lib/routes';
import type { AppRole, UserScope } from '@/lib/permissions';

interface Profile {
  full_name: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  userScope: UserScope | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  userScope: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userScope, setUserScope] = useState<UserScope | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; });
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function fetchProfile(userId: string) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .single();
        if (active) setProfile(data);
      } catch {
        // profile fetch is non-critical
      }
    }

    async function fetchUserScope() {
      try {
        const { data, error } = await supabase.rpc('get_user_scope');
        if (error) throw error;
        if (active && data && data.length > 0) {
          const row = data[0];
          setUserScope({
            role: row.role as AppRole,
            person_id: row.person_id,
            zone_id: row.zone_id,
            community_id: row.community_id,
            has_community_grants: row.has_community_grants ?? false,
          });
        }
      } catch {
        // scope fetch is non-critical; default to null (no permissions)
      }
    }

    // Use onAuthStateChange as the single source of truth.
    // It fires INITIAL_SESSION when the client finishes restoring
    // the session from storage, avoiding getSession() lock issues.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setLoading(false);

        if (currentUser) {
          fetchProfile(currentUser.id);
          fetchUserScope();
        } else {
          setProfile(null);
          setUserScope(null);
        }

        if (event === 'SIGNED_OUT') {
          routerRef.current.replace('/login');
        }
      }
    );

    // Safety net: if onAuthStateChange never fires, force loading off
    const timeout = setTimeout(() => {
      if (active) setLoading(false);
    }, 3000);

    return () => {
      active = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  // Redirect to login if unauthenticated and on a protected route
  useEffect(() => {
    if (loading) return;
    const isPublic = publicRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + '/')
    );
    if (!user && !isPublic) {
      router.replace(`/login?redirectTo=${encodeURIComponent(pathname)}`);
    }
  }, [user, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, profile, userScope, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
