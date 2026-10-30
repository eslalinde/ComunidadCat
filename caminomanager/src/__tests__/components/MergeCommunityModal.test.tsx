import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MergeCommunityModal } from '@/components/crud/MergeCommunityModal';
import { createTableMock } from '../helpers/queryHarness';
import { toast } from 'sonner';
const db = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => db }));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));
const close = vi.fn(), refresh = vi.fn(); let mock: ReturnType<typeof createTableMock>;
beforeEach(() => { vi.clearAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {}); mock = createTableMock({ communities: { data: [{ id: 2, number: '2', actual_brothers: 20 }], error: null }, brothers: { data: null, count: 20, error: null }, belongs: { data: null, count: 4, error: null }, community_step_log: { data: null, count: 3, error: null } }); db.from.mockImplementation(mock.from); db.rpc.mockResolvedValue({ data: { success: true, brothers_moved: 20, members_moved: 4, removed_community_number: '2' }, error: null }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function setup(open = true) { return render(<MergeCommunityModal open={open} onClose={close} keepCommunityId={1} keepCommunityNumber="1" parishId={10} onSuccess={refresh} />); }
it.each([false, true])('previsualiza y fusiona exclusivamente tras confirmar, error=%s', async (fails) => {
  setup(); await screen.findByRole('option', { name: 'Comunidad 2 (20 hermanos)' });
  expect(mock.calls).toContainEqual({ table: 'communities', method: 'neq', args: ['id', 1] });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } }); await screen.findByText('20'); expect(screen.getByText('4')).toBeVisible(); expect(screen.getByText('3')).toBeVisible();
  if (fails) db.rpc.mockResolvedValue({ error: { message: 'denied' } });
  fireEvent.change(screen.getByPlaceholderText('Escribe FUSIONAR'), { target: { value: 'FUSIONAR' } }); fireEvent.click(screen.getByRole('button', { name: /Fusionar/ }));
  await waitFor(() => expect(db.rpc).toHaveBeenCalledWith('merge_communities', { p_keep_community_id: 1, p_remove_community_id: 2 }));
  if (fails) { await screen.findByText('Error al fusionar las comunidades'); expect(close).not.toHaveBeenCalled(); expect(refresh).not.toHaveBeenCalled(); }
  else { await waitFor(() => expect(refresh).toHaveBeenCalledOnce()); expect(toast.success).toHaveBeenCalledWith('Fusión exitosa', expect.objectContaining({ description: expect.stringContaining('20 hermano(s)') })); expect(close).toHaveBeenCalledOnce(); }
});
it('no consulta cerrado y permite cancelar sin mutar', async () => { const view = setup(false); expect(db.from).not.toHaveBeenCalled(); view.rerender(<MergeCommunityModal open onClose={close} keepCommunityId={1} keepCommunityNumber="1" parishId={10} onSuccess={refresh} />); await screen.findByRole('option', { name: /Comunidad 2/ }); fireEvent.click(screen.getByText('Cancelar')); expect(close).toHaveBeenCalledOnce(); expect(db.rpc).not.toHaveBeenCalled(); });
