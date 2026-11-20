import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { signOut } from './signOut';
import { withGlobalLogout } from '@/utils/supabase/logoutFetch';

it.each([204, 400])('borra las credenciales antes de la revocación global (HTTP %i)', async (status) => {
  vi.clearAllMocks();
  const key = 'test-logout-session-' + status;
  localStorage.setItem(key, JSON.stringify({
    access_token: 'test-access', refresh_token: 'test-refresh', user: { id: 'user' },
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  }));
  let respond!: () => void;
  const pending = new Promise<void>(resolve => { respond = resolve; });
  const request = vi.fn(async () => {
    await pending;
    return new Response(status === 204 ? null : '{"message":"Revocación no disponible"}', { status });
  });
  const client = createSupabaseClient('https://auth.example.invalid', 'test-key', {
    auth: { storage: localStorage, storageKey: key, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: withGlobalLogout('https://auth.example.invalid', request) },
  });
  vi.mocked(createClient).mockReturnValue(client);
  expect((await client.auth.getSession()).data.session).toBeTruthy();
  const done = signOut();
  await vi.waitFor(() => expect(request).toHaveBeenCalledWith(
    'https://auth.example.invalid/auth/v1/logout?scope=global', expect.objectContaining({ method: 'POST' })
  ));
  expect(request).toHaveBeenCalledOnce();
  expect(localStorage.getItem(key)).toBeNull();
  respond();
  await done;
  expect(toast.warning).toHaveBeenCalledTimes(status === 204 ? 0 : 1);
  expect((await client.auth.getSession()).data.session).toBeNull();
});
