import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AccountPage from '@/app/(main)/(protected)/cuenta/page';
import { createTableMock, type QueryResponse } from '../helpers/queryHarness';
const mocks = vi.hoisted(() => ({ db: { from: vi.fn(), auth: { getUser: vi.fn() } }, router: { push: vi.fn() }, scope: null as { zone_id?: number; community_id?: number } | null, access: [] as { community_id: number; community_number: string; parish_name: string }[] }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => mocks.db }));
vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ userScope: mocks.scope }) }));
vi.mock('@/hooks/useCommunityAccess', () => ({ useMyCommunitiesAccess: () => ({ communities: mocks.access, loading: false }) }));
let responses: Record<string, QueryResponse>; let mock: ReturnType<typeof createTableMock>;
beforeEach(() => { vi.clearAllMocks(); mocks.db.from.mockReset(); vi.spyOn(console, 'error').mockImplementation(() => {}); mocks.scope = null; mocks.access = []; mocks.db.auth.getUser.mockResolvedValue({ data: { user: { id: 'u', email: 'u@example.com' } } }); responses = { profiles: { data: { full_name: 'Usuario', username: 'usuario', website: 'https://example.com', avatar_url: 'avatar.png', role: 'admin' }, error: null }, city_zones: { data: { name: 'Norte' }, error: null }, communities: { data: { number: '7', parish: { name: 'San José' } }, error: null } }; mock = createTableMock(responses); mocks.db.from.mockImplementation(mock.from); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('Perfil', () => {
  it.each(['ok', 'error', 'throw'])('actualiza datos del usuario, resultado=%s', async (scenario) => {
    render(<AccountPage />); await screen.findByText('Mi Perfil');
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Nuevo Nombre' } });
    fireEvent.change(screen.getByLabelText('Nombre de usuario'), { target: { value: 'nuevo' } });
    fireEvent.change(screen.getByLabelText('Sitio web'), { target: { value: 'https://nuevo.example.com' } });
    if (scenario === 'error') responses.profiles.error = { message: 'denied' }; if (scenario === 'throw') mocks.db.from.mockImplementation(() => { throw new Error(); });
    fireEvent.click(screen.getByText('Guardar cambios'));
    await screen.findByText(scenario === 'ok' ? '¡Perfil actualizado correctamente!' : scenario === 'error' ? 'Error al actualizar el perfil.' : 'Error inesperado al guardar.');
    if (scenario !== 'throw') expect(mock.calls).toContainEqual({ table: 'profiles', method: 'update', args: [expect.objectContaining({ full_name: 'Nuevo Nombre', username: 'nuevo', website: 'https://nuevo.example.com', avatar_url: 'avatar.png' })] });
  });
  it.each(['zone', 'zone-empty', 'community', 'community-number', 'community-empty', 'global', 'viewer'])('explica alcance %s', async (scope) => {
    if (scope.startsWith('zone')) mocks.scope = { zone_id: 3 };
    if (scope.startsWith('community')) mocks.scope = { community_id: 4 };
    if (scope.endsWith('empty')) { responses.city_zones.data = null; responses.communities.data = null; }
    if (scope === 'community-number') responses.communities.data = { number: '7' };
    if (scope === 'viewer') responses.profiles.data = { role: 'viewer' };
    render(<AccountPage />); await screen.findByText('Mi Perfil');
    const expected = { zone: 'Zona Norte', 'zone-empty': 'Zona #3', community: 'Comunidad 7 — San José', 'community-number': 'Comunidad 7', 'community-empty': 'Comunidad #4', global: 'Acceso global', viewer: 'Sin acceso asignado' }[scope]!;
    await waitFor(() => expect(screen.getByTestId('scope-label')).toHaveTextContent(expected));
  });
  it('enlaza comunidades otorgadas', async () => { mocks.access = [{ community_id: 4, community_number: '7', parish_name: 'San José' }]; render(<AccountPage />); const link = await screen.findByRole('link', { name: /Comunidad 7/ }); expect(link).toHaveAttribute('href', '/comunidades/detalle?id=4'); });
  it.each(['error', 'throw'])('informa error de carga: %s', async (scenario) => { if (scenario === 'error') responses.profiles.error = { message: 'denied' }; else mocks.db.from.mockImplementation(() => { throw new Error(); }); render(<AccountPage />); await screen.findByText(scenario === 'error' ? 'Error al cargar los datos del perfil.' : 'Error inesperado al cargar los datos.'); });
  it('redirige visitantes al login', async () => { mocks.db.auth.getUser.mockResolvedValue({ data: { user: null } }); render(<AccountPage />); await waitFor(() => expect(mocks.router.push).toHaveBeenCalledWith('/login')); expect(mocks.db.from).not.toHaveBeenCalled(); });
});
