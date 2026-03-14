'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function AuthConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');

    if (!tokenHash || !type) {
      router.replace('/login');
      return;
    }

    const supabase = createClient();

    supabase.auth
      .verifyOtp({
        token_hash: tokenHash,
        type: type as 'signup' | 'email' | 'recovery' | 'email_change',
      })
      .then(({ error: verifyError }) => {
        if (verifyError) {
          setError(verifyError.message);
          return;
        }
        // Clear token from URL and redirect to home
        router.replace('/');
      });
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <a href="/login" className="text-primary underline">
            Volver al inicio de sesión
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Confirmando tu cuenta...</p>
    </div>
  );
}
