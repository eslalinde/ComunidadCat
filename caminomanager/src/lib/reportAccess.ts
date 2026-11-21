import { createClient } from '@/utils/supabase/client';

export async function assertReportAccess(expected?: string): Promise<string> {
  const { data, error } = await createClient().rpc('get_user_scope');
  const scope = Array.isArray(data) && data.length === 1 ? data[0] : null;
  if (error || scope?.can_read_reports !== true) {
    throw new Error('No se pudo autorizar la consulta del reporte.');
  }
  const key = JSON.stringify([scope.role, scope.zone_id, scope.community_id, scope.granted_community_ids, scope.person_id]);
  if (expected !== undefined && key !== expected) {
    throw new Error('Los permisos del reporte han cambiado.');
  }
  return key;
}

export async function readAuthorizedReport<T>(read: () => Promise<T>): Promise<T> {
  const scope = await assertReportAccess();
  const result = await read();
  await assertReportAccess(scope);
  return result;
}
