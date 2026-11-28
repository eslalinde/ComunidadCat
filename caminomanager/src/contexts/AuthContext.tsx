'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { publicRoutes, routes } from '@/lib/routes';
import type { AppRole, UserScope } from '@/lib/permissions';

interface Profile {
  full_name: string | null;
}

type FeatureFlags = Record<string, boolean>;

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  userScope: UserScope | null;
  featureFlags: FeatureFlags;
  setFeatureFlags: (flags: FeatureFlags) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  userScope: null,
  featureFlags: {},
  setFeatureFlags: () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userScope, setUserScope] = useState<UserScope | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; });
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let identity: string | null = null;
    let revision = 0;
    let scopeRequest = 0;

    async function fetchProfile(userId: string, request: number) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, feature_flags')
          .eq('id', userId)
          .single();
        if (active && request === revision) {
          setProfile(data ? { full_name: data.full_name } : null);
          setFeatureFlags((data?.feature_flags as FeatureFlags) || {});
        }
      } catch {
        // profile fetch is non-critical
      }
    }

    async function fetchUserScope(request: number) {
      const currentRequest = ++scopeRequest;
      const isCurrent = () => active && request === revision && currentRequest === scopeRequest;
      try {
        const { data, error } = await supabase.rpc('get_user_scope');
        if (!isCurrent()) return;
        if (!error && data?.length) {
          const row = data[0];
          setUserScope({
            role: row.role as AppRole,
            person_id: row.person_id,
            zone_id: row.zone_id,
            community_id: row.community_id,
            has_community_grants: row.has_community_grants ?? false,
            granted_community_ids: row.granted_community_ids ?? [],
          });
        } else setUserScope(null);
      } catch {
        if (isCurrent()) setUserScope(null);
      }
    }

    function refreshScope() {
      if (identity && document.visibilityState === 'visible') void fetchUserScope(revision);
    }
    window.addEventListener('focus', refreshScope);
    const scopeTimer = window.setInterval(refreshScope, 60_000);

    // Use onAuthStateChange as the single source of truth.
    // It fires INITIAL_SESSION when the client finishes restoring
    // the session from storage, avoiding getSession() lock issues.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;

        const currentUser = session?.user ?? null;
        const nextIdentity = currentUser?.id ?? null;
        if (identity !== nextIdentity) {
          identity = nextIdentity;
          revision++;
          setProfile(null);
          setUserScope(null);
          setFeatureFlags({});
        }
        setUser(currentUser);
        setLoading(false);

        if (currentUser) {
          fetchProfile(currentUser.id, revision);
          fetchUserScope(revision);
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
      window.clearInterval(scopeTimer);
      window.removeEventListener('focus', refreshScope);
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
      // Web visitors entering through the root see the public landing page.
      // The desktop app (Electron) goes straight to the login screen.
      if (pathname === routes.home && !window.electronAPI) {
        router.replace(routes.publico);
        return;
      }
      const fullPath = pathname + (window.location.search || '');
      router.replace(`${routes.login}?redirectTo=${encodeURIComponent(fullPath)}`);
    }
  }, [user, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, profile, userScope, featureFlags, setFeatureFlags, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
