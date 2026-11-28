import { expect, it, vi } from 'vitest';
import { assertReportAccess } from '@/lib/reportAccess';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ rpc }) }));
const scope = { role: 'zone_leader', zone_id: 1, community_id: null, granted_community_ids: [], person_id: null, can_read_reports: true };

it('autoriza únicamente cuando Supabase confirma el permiso', async () => {
  rpc.mockResolvedValue({ data: [scope], error: null });
  const key = await assertReportAccess();
  await expect(assertReportAccess(key)).resolves.toBe(key);
  expect(rpc).toHaveBeenCalledWith('get_user_scope');
});

it.each([
  { data: [{ ...scope, can_read_reports: false }], error: null },
  { data: null, error: null },
  { data: [scope], error: { message: 'Sin respuesta válida' } },
])('bloquea un permiso ausente o una respuesta con error', async (response) => {
  rpc.mockResolvedValueOnce(response);
  await expect(assertReportAccess()).rejects.toThrow('No se pudo autorizar');
});

it('rechaza una reasignación que mantiene el rol pero cambia sus comunidades', async () => {
  rpc.mockResolvedValueOnce({ data: [scope], error: null })
    .mockResolvedValueOnce({ data: [{ ...scope, granted_community_ids: [8] }], error: null });
  await expect(assertReportAccess(await assertReportAccess())).rejects.toThrow('han cambiado');
});
