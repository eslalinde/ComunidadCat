import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import AdminPage from '@/app/(main)/(protected)/admin/page';
import type { AdminUser } from '@/hooks/useAdminUsers';
import { createQueryHarness, createTableMock } from '../helpers/queryHarness';
import { toast } from 'sonner';
const mocks = vi.hoisted(() => ({ db: { from: vi.fn(), rpc: vi.fn(), auth: { getUser: vi.fn() } }, router: { push: vi.fn() }, users: [] as AdminUser[], loading: false, error: null as Error | null, mobile: false, updateRole: vi.fn(), createUser: vi.fn() }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => mocks.db }));
vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => mocks.mobile }));
vi.mock('@/hooks/useAdminUsers', () => ({ useAdminUsers: () => ({ ...mocks, isUpdatingRole: false, isCreatingUser: false }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: ReactNode; value: string; onValueChange: (value: string) => void }) => <select value={value} onChange={(e) => onValueChange(e.target.value)}>{children}</select>,
  SelectTrigger: () => null, SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));
const user: AdminUser = { id: 'other', email: 'u@example.com', full_name: 'Usuario', username: 'usuario', avatar_url: null, role: 'viewer', zone_id: null, community_id: null, person_id: null, last_sign_in_at: null, created_at: '2020-01-01' };
let harness: ReturnType<typeof createQueryHarness>;
beforeEach(() => {
  vi.clearAllMocks(); mocks.mobile = false; mocks.loading = false; mocks.error = null; mocks.users = [{ ...user, id: 'self', role: 'admin', email: 'admin@example.com', last_sign_in_at: '2026-01-01' }, user];
  mocks.db.auth.getUser.mockResolvedValue({ data: { user: { id: 'self' } } }); mocks.db.rpc.mockResolvedValue({ data: 'admin' });
  mocks.db.from.mockImplementation(createTableMock({ city_zones: { data: [{ id: 3, name: 'Norte', city: { name: 'Bogotá' } }], error: null }, communities: { data: [{ id: 4, number: '7', parish: { name: 'San José' } }], error: null } }).from);
  harness = createQueryHarness();
});
afterEach(() => { cleanup(); harness.client.clear(); });
const setup = () => render(<AdminPage />, { wrapper: harness.wrapper });
describe('Administración', () => {
  it.each(['anonymous', 'viewer'])('rechaza acceso de %s', async (role) => { if (role === 'anonymous') mocks.db.auth.getUser.mockResolvedValue({ data: { user: null } }); else mocks.db.rpc.mockResolvedValue({ data: role }); setup(); await waitFor(() => expect(mocks.router.push).toHaveBeenCalledWith(role === 'anonymous' ? '/login' : '/')); expect(screen.queryByText('Crear usuario')).not.toBeInTheDocument(); });
  it.each([false, true])('busca y muestra alcances sin permitir cambiar rol propio, móvil=%s', async (mobile) => {
    mocks.mobile = mobile; mocks.users.push({ ...user, id: 'zone', email: 'zona@example.com', zone_id: 3 }, { ...user, id: 'community', email: 'com@example.com', community_id: 4 }); setup();
    await screen.findByText('Administración de Usuarios'); await screen.findByText('Zona: Norte'); expect(screen.getByText('Com. 7 (San José)')).toBeVisible();
    expect(screen.getByTitle('No puedes cambiar tu propio rol')).toBeVisible();
    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre, email o usuario...'), { target: { value: 'ZONA@' } }); expect(screen.queryByText('u@example.com')).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre, email o usuario...'), { target: { value: 'nadie' } }); expect(screen.getByText('No se encontraron usuarios con ese criterio.')).toBeVisible();
  });
  it.each(['zone_leader', 'community_responsible', 'admin', 'contributor'])('confirma cambio de rol %s con ámbito válido', async (role) => {
    setup(); await screen.findByText('Administración de Usuarios'); fireEvent.change(screen.getByRole('combobox'), { target: { value: role } });
    const dialog = within(screen.getByRole('dialog'));
    if (role === 'zone_leader' || role === 'community_responsible') { expect(dialog.getByText('Confirmar')).toBeDisabled(); fireEvent.change(dialog.getByRole('combobox'), { target: { value: role === 'zone_leader' ? '3' : '4' } }); }
    fireEvent.click(dialog.getByText('Confirmar'));
    expect(mocks.updateRole).toHaveBeenCalledWith({ targetUserId: 'other', newRole: role, personId: null, zoneId: role === 'zone_leader' ? 3 : null, communityId: role === 'community_responsible' ? 4 : null }, expect.any(Object));
    act(() => mocks.updateRole.mock.calls[0][1].onSettled()); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it.each(['viewer', 'zone_contributor', 'community_responsible', 'contributor'])('crea usuario de rol %s', async (role) => {
    setup(); fireEvent.click(await screen.findByText('Crear usuario')); const dialog = within(screen.getByRole('dialog')); expect(dialog.getByText('Crear usuario')).toBeDisabled();
    fireEvent.change(dialog.getByPlaceholderText('correo@ejemplo.com'), { target: { value: 'nuevo@example.com' } }); fireEvent.change(dialog.getByPlaceholderText('Mínimo 6 caracteres'), { target: { value: 'secret123' } }); fireEvent.change(dialog.getByPlaceholderText('Nombre del usuario'), { target: { value: ' Nuevo ' } });
    fireEvent.change(dialog.getAllByRole('combobox')[0], { target: { value: role } });
    if (role === 'zone_contributor') fireEvent.change(dialog.getAllByRole('combobox')[1], { target: { value: '3' } });
    if (role === 'community_responsible') fireEvent.change(dialog.getAllByRole('combobox')[1], { target: { value: '4' } });
    fireEvent.click(dialog.getByText('Crear usuario'));
    expect(mocks.createUser).toHaveBeenCalledWith({ email: 'nuevo@example.com', password: 'secret123', fullName: 'Nuevo', role, zoneId: role === 'zone_contributor' ? 3 : null, communityId: role === 'community_responsible' ? 4 : null }, expect.any(Object));
    act(() => mocks.createUser.mock.calls[0][1].onSuccess()); expect(toast.success).toHaveBeenCalledWith('Usuario creado exitosamente'); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('muestra fallo de creación y permite cancelar', async () => { setup(); fireEvent.click(await screen.findByText('Crear usuario')); fireEvent.change(screen.getByPlaceholderText('correo@ejemplo.com'), { target: { value: 'x@example.com' } }); fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), { target: { value: 'secret123' } }); fireEvent.click(within(screen.getByRole('dialog')).getByText('Crear usuario')); act(() => mocks.createUser.mock.calls[0][1].onError(new Error('Duplicado'))); expect(toast.error).toHaveBeenCalledWith('Duplicado'); fireEvent.click(screen.getByText('Cancelar')); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); });
  it.each(['loading', 'error', 'empty'])('muestra estado %s', async (state) => { mocks.loading = state === 'loading'; mocks.error = state === 'error' ? new Error('Fallo') : null; mocks.users = []; setup(); await screen.findByText('Administración de Usuarios'); expect(screen.getByText(state === 'loading' ? 'Cargando usuarios...' : state === 'error' ? 'Error al cargar usuarios: Fallo' : 'No hay usuarios registrados.')).toBeVisible(); });
});
