import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { CommunityAccessSection } from '@/components/crud/CommunityAccessSection';
import type { CommunityAccessUser } from '@/hooks/useCommunityAccess';
import { toast } from 'sonner';
const mocks = vi.hoisted(() => ({ accessUsers: [] as CommunityAccessUser[], loading: false, loadingUsers: false, grantAccess: vi.fn(), revokeAccess: vi.fn(), admin: vi.fn() }));
vi.mock('@/hooks/useCommunityAccess', () => ({ useCommunityAccessUsers: () => ({ ...mocks, isGranting: false, isRevoking: false }) }));
vi.mock('@/hooks/useAdminUsers', () => ({ useAdminUsers: (enabled: boolean) => { mocks.admin(enabled); return { users: [{ id: 'assigned', full_name: 'Asignado', role: 'viewer' }, { id: 'new', full_name: 'Nuevo', role: 'viewer' }], loading: mocks.loadingUsers }; } }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: ReactNode; value: string; onValueChange: (value: string) => void }) => <select value={value} onChange={(e) => onValueChange(e.target.value)}>{children}</select>, SelectTrigger: () => null, SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>, SelectItem: ({ value, children, disabled }: { value: string; children: ReactNode; disabled?: boolean }) => <option value={value} disabled={disabled}>{children}</option>,
}));
const granted: CommunityAccessUser = { user_id: 'assigned', email: 'u@example.com', full_name: 'Asignado', role: 'viewer', granted_by_name: 'Admin', created_at: '2026-01-01', source: 'grant' };
beforeEach(() => { vi.clearAllMocks(); mocks.accessUsers = [granted]; mocks.loading = false; mocks.loadingUsers = false; }); afterEach(cleanup);
function setup() { render(<CommunityAccessSection communityId={10} />); fireEvent.click(screen.getByText('Usuarios')); }
it.each([false, true])('otorga acceso sólo a usuarios disponibles, error=%s', (fails) => {
  setup(); expect(mocks.admin).toHaveBeenLastCalledWith(false); fireEvent.click(screen.getByText('Agregar usuario')); expect(mocks.admin).toHaveBeenLastCalledWith(true);
  const dialog = within(screen.getByRole('dialog', { name: 'Otorgar acceso a comunidad' })); expect(dialog.getByText('Otorgar acceso')).toBeDisabled(); expect(dialog.queryByRole('option', { name: /Asignado/ })).not.toBeInTheDocument();
  fireEvent.change(dialog.getByRole('combobox'), { target: { value: 'new' } }); fireEvent.click(dialog.getByText('Otorgar acceso'));
  expect(mocks.grantAccess).toHaveBeenCalledWith('new', expect.any(Object));
  act(() => fails ? mocks.grantAccess.mock.calls[0][1].onError(new Error('Sin permiso')) : mocks.grantAccess.mock.calls[0][1].onSuccess());
  expect(fails ? toast.error : toast.success).toHaveBeenCalledWith(fails ? 'Sin permiso' : 'Acceso otorgado');
  if (fails) fireEvent.click(dialog.getByText('Cancelar')); expect(screen.queryByRole('dialog', { name: 'Otorgar acceso a comunidad' })).not.toBeInTheDocument();
});
it.each([false, true])('revoca sólo concesiones explícitas con confirmación, error=%s', (fails) => {
  mocks.accessUsers.push({ ...granted, user_id: 'profile', full_name: 'Responsable', source: 'profile' }); setup(); expect(screen.getAllByText('Asignado')).toHaveLength(2);
  // The grant row owns the only destructive control; profile access has none.
  const grantRow = screen.getByText('Asignado', { selector: 'p' }).closest('.bg-gray-50') as HTMLElement;
  expect(within(screen.getByText('Responsable').closest('.bg-gray-50') as HTMLElement).queryByRole('button')).not.toBeInTheDocument();
  fireEvent.click(within(grantRow).getByRole('button')); fireEvent.click(screen.getByText('Cancelar')); expect(mocks.revokeAccess).not.toHaveBeenCalled();
  fireEvent.click(within(grantRow).getByRole('button')); fireEvent.click(screen.getByText('Revocar')); expect(mocks.revokeAccess).toHaveBeenCalledWith('assigned', expect.any(Object));
  act(() => fails ? mocks.revokeAccess.mock.calls[0][1].onError(new Error('Sin permiso')) : mocks.revokeAccess.mock.calls[0][1].onSuccess());
  expect(fails ? toast.error : toast.success).toHaveBeenCalledWith(fails ? 'Sin permiso' : 'Acceso revocado');
});
it('explica ausencia de accesos', () => { mocks.accessUsers = []; setup(); expect(screen.getByText('No hay usuarios con acceso especial a esta comunidad.')).toBeVisible(); });
it('muestra carga de usuarios antes de conceder acceso', () => { mocks.loadingUsers = true; setup(); fireEvent.click(screen.getByText('Agregar usuario')); expect(screen.getByText('Cargando usuarios...')).toBeVisible(); expect(screen.getByText('Otorgar acceso')).toBeDisabled(); });
