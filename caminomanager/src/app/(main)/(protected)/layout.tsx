'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessRoute } from '@/lib/permissions';
import { useEffect, useRef } from 'react';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userScope, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    if (loading || !userScope || redirected.current) return;

    if (!canAccessRoute(userScope, pathname)) {
      redirected.current = true;
      router.replace('/');
    }
  }, [userScope, loading, pathname, router]);

  // Reset ref when pathname changes (user navigated to a new page)
  useEffect(() => {
    redirected.current = false;
  }, [pathname]);

  if (loading) return null;

  // While we wait for the redirect to take effect, don't render the protected content
  if (userScope && !canAccessRoute(userScope, pathname)) {
    return null;
  }

  return <>{children}</>;
}
