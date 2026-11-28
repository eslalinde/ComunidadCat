import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { QueryProvider } from '@/app/QueryProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createTableMock } from '../helpers/queryHarness';

type Session = { user: { id: string } } | null;
const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn(), replace: vi.fn(), pathname: '/login' }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ ...mocks, auth: { onAuthStateChange: mocks.subscribe } }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }), usePathname: () => mocks.pathname }));
let notify: (event: string, session: Session) => void;
function Consumer() { const auth = useAuth(); return <output>{JSON.stringify({ user: auth.user?.id, profile: auth.profile, scope: auth.userScope, flags: auth.featureFlags, loading: auth.loading })}</output>; }
beforeEach(() => {
  vi.clearAllMocks(); mocks.pathname = '/login';
  mocks.subscribe.mockImplementation((callback) => { notify = callback; return { data: { subscription: { unsubscribe: mocks.unsubscribe } } }; });
  mocks.from.mockImplementation(createTableMock({ profiles: { data: { full_name: 'Ana', feature_flags: { community_visits: true } }, error: null } }).from);
  mocks.rpc.mockResolvedValue({ data: [{ role: 'viewer', person_id: 1, zone_id: null, community_id: 10 }], error: null });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
const state = () => JSON.parse(screen.getByRole('status').textContent || '{}');
it('aísla la caché de una pestaña que recibe eventos de cambio de cuenta', async () => {
  const key = ['community', 10, 'brothers'];
  function CachedMembers() {
    const client = useQueryClient();
    const { data } = useQuery<string>({ queryKey: key, enabled: false });
    return <button onClick={() => client.setQueryData(key, 'Ana')}>{data ?? 'Vacío'}</button>;
  }
  let finishOldScope!: (value: unknown) => void;
  render(<AuthProvider><QueryProvider><CachedMembers /><Consumer /></QueryProvider></AuthProvider>);
  await act(async () => notify('SIGNED_IN', { user: { id: 'first' } }));
  act(() => screen.getByRole('button').click());
  await screen.findByRole('button', { name: 'Ana' });
  await act(async () => notify('TOKEN_REFRESHED', { user: { id: 'first' } }));
  expect(screen.getByRole('button')).toHaveTextContent('Ana');
  mocks.rpc.mockReturnValueOnce(new Promise(resolve => { finishOldScope = resolve; }));
  await act(async () => notify('TOKEN_REFRESHED', { user: { id: 'first' } }));
  await act(async () => notify('SIGNED_OUT', null));
  await act(async () => notify('SIGNED_IN', { user: { id: 'second' } }));
  await act(async () => finishOldScope({ data: [{ role: 'admin' }] }));
  expect(screen.getByRole('button')).toHaveTextContent('Vacío');
  expect(state().scope.role).toBe('viewer');
});
it('vacía la caché cuando se pierde una de dos concesiones en la misma sesión', async () => {
  const scope = { role: 'viewer', has_community_grants: true, granted_community_ids: [10, 11] };
  mocks.rpc.mockResolvedValue({ data: [scope] });
  function CachedReport() {
    const client = useQueryClient();
    const { data } = useQuery<string>({ queryKey: ['report'], enabled: false });
    return <button onClick={() => client.setQueryData(['report'], 'Anterior')}>{data ?? 'Vacío'}</button>;
  }
  render(<AuthProvider><QueryProvider><CachedReport /></QueryProvider></AuthProvider>);
  await act(async () => notify('INITIAL_SESSION', { user: { id: 'reader' } }));
  act(() => screen.getByRole('button').click());
  await screen.findByRole('button', { name: 'Anterior' });
  mocks.rpc.mockResolvedValue({ data: [{ ...scope, granted_community_ids: [11] }] });
  await act(async () => window.dispatchEvent(new Event('focus')));
  expect(screen.getByRole('button')).toHaveTextContent('Vacío');
});
it('restaura sesión, perfil, alcance y limpia datos al salir', async () => {
  render(<AuthProvider><Consumer /></AuthProvider>);
  expect(state().loading).toBe(true);
  act(() => notify('INITIAL_SESSION', { user: { id: 'u' } }));
  await waitFor(() => expect(state().profile).toEqual({ full_name: 'Ana' }));
  await waitFor(() => expect(state().scope).toMatchObject({ role: 'viewer', has_community_grants: false }));
  expect(state().flags).toEqual({ community_visits: true });
  act(() => notify('SIGNED_OUT', null));
  expect(state()).toMatchObject({ profile: null, scope: null, flags: {}, loading: false });
  expect(mocks.replace).toHaveBeenCalledWith('/login');
});
it('descarta permisos previos si falla la revalidación de la misma cuenta', async () => {
  render(<AuthProvider><Consumer /></AuthProvider>);
  await act(async () => notify('INITIAL_SESSION', { user: { id: 'reader' } }));
  expect(state().scope.role).toBe('viewer');
  mocks.rpc.mockRejectedValueOnce(new Error('Offline'));
  await act(async () => window.dispatchEvent(new Event('focus')));
  expect(state().scope).toBeNull();
});
it.each(['/login', '/signup', '/publico', '/auth/confirm', '/ui-lab'])('no redirige rutas públicas %s', (path) => {
  mocks.pathname = path; render(<AuthProvider><Consumer /></AuthProvider>);
  act(() => notify('INITIAL_SESSION', null)); expect(mocks.replace).not.toHaveBeenCalled();
});
it('conserva destino y query string al proteger una ruta', () => {
  window.history.replaceState({}, '', '/comunidades/detalle?id=10'); mocks.pathname = '/comunidades/detalle';
  render(<AuthProvider><Consumer /></AuthProvider>); act(() => notify('INITIAL_SESSION', null));
  expect(mocks.replace).toHaveBeenCalledWith('/login?redirectTo=%2Fcomunidades%2Fdetalle%3Fid%3D10');
  window.history.replaceState({}, '', '/');
});
it('envía a la landing al visitante web sin sesión que entra por la raíz', () => {
  mocks.pathname = '/'; render(<AuthProvider><Consumer /></AuthProvider>);
  act(() => notify('INITIAL_SESSION', null));
  expect(mocks.replace).toHaveBeenCalledWith('/publico');
});
it('la app de escritorio sin sesión va directo al login desde la raíz', () => {
  window.electronAPI = {} as NonNullable<typeof window.electronAPI>;
  try {
    mocks.pathname = '/'; render(<AuthProvider><Consumer /></AuthProvider>);
    act(() => notify('INITIAL_SESSION', null));
    expect(mocks.replace).toHaveBeenCalledWith('/login?redirectTo=%2F');
  } finally {
    delete window.electronAPI;
  }
});
it.each(['empty', 'error', 'rejected'])('tolera perfil/alcance %s sin otorgar permisos', async (scenario) => {
  mocks.rpc.mockResolvedValue({ data: [], error: scenario === 'error' ? { message: 'Error' } : null });
  mocks.from.mockImplementation(createTableMock({ profiles: { data: null, error: null } }).from);
  if (scenario === 'rejected') { mocks.rpc.mockRejectedValue(new Error('Offline')); mocks.from.mockImplementation(() => { throw new Error('Offline'); }); }
  render(<AuthProvider><Consumer /></AuthProvider>); await act(async () => notify('INITIAL_SESSION', { user: { id: 'u' } }));
  expect(state()).toMatchObject({ user: 'u', profile: null, scope: null, flags: {}, loading: false });
});
it('cancela suscripciones y callbacks tardíos después del desmontaje', async () => {
  let resolve!: (value: unknown) => void; mocks.rpc.mockReturnValue(new Promise((r) => { resolve = r; }));
  const view = render(<AuthProvider><Consumer /></AuthProvider>);
  act(() => notify('SIGNED_IN', { user: { id: 'u' } })); view.unmount();
  await act(async () => { resolve({ data: [{ role: 'admin' }], error: null }); notify('SIGNED_OUT', null); });
  expect(mocks.unsubscribe).toHaveBeenCalledOnce(); expect(mocks.replace).not.toHaveBeenCalled();
});
it('termina la espera si Auth no emite ningún evento', () => {
  vi.useFakeTimers(); render(<AuthProvider><Consumer /></AuthProvider>);
  act(() => vi.advanceTimersByTime(3000)); expect(state().loading).toBe(false);
});
