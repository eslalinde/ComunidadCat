import { contactKey, open, seal, type Contact, type Envelope } from './crypto.ts';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};
function response(status: number, body: unknown) {
  return Response.json(body, { status, headers });
}
const url = Deno.env.get('SUPABASE_URL')!;
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const result = await fetch(url + '/rest/v1/rpc/' + name, {
    method: 'POST', headers: { apikey: service, Authorization: 'Bearer ' + service, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (result.status === 403) throw new DOMException('Acceso denegado', 'NotAllowedError');
  if (!result.ok) throw new Error('Operación de contactos rechazada');
  const text = await result.text();
  return text ? JSON.parse(text) : null;
}
function validId(id: unknown): id is number {
  // Local demo records use negative primary keys to avoid identity collisions.
  return typeof id === 'number' && Number.isSafeInteger(id) && id !== 0;
}
function validNumber(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && value.length <= 100);
}
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return response(405, { error: 'Método no permitido' });
  const token = req.headers.get('Authorization');
  let body;
  try { body = await req.json(); } catch { return response(400, { error: 'Solicitud inválida' }); }
  if (!body || typeof body !== 'object') return response(400, { error: 'Solicitud inválida' });
  try {
    if (body.action === 'migrate') {
      const serverKey: unknown = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default;
      const validApiKey = typeof serverKey === 'string' && serverKey.startsWith('sb_secret_')
        && req.headers.get('apikey') === serverKey;
      if (!validApiKey && !(service && token === 'Bearer ' + service)) return response(403, { error: 'Acceso denegado' });
      const rows = await rpc<(Contact & {person_id: number})[]>('pending_legacy_contacts', {});
      if (rows.length) {
        const key = await contactKey(Deno.env.get('PERSON_CONTACT_KEY_V1')!);
        for (const row of rows) {
          const original = { phone: row.phone, mobile: row.mobile };
          const envelope = await seal(key, original, String(row.person_id));
          const verified = await open(key, envelope);
          if (verified.phone !== original.phone || verified.mobile !== original.mobile) throw new Error('Cifrado inválido');
          await rpc('finish_legacy_contact', {p_person: row.person_id, p_envelope: envelope});
        }
      }
      return response(200, { processed: rows.length });
    }
    if (!token?.startsWith('Bearer ')) return response(401, { error: 'Se requiere iniciar sesión' });
    const session = await fetch(url + '/auth/v1/user', { headers: { Authorization: token, apikey: anon } });
    if (!session.ok) return response(401, { error: 'Sesión inválida' });
    const { id: actor } = await session.json();
    if (!actor) return response(401, { error: 'Sesión inválida' });
    if (body.action === 'read') {
      const { ids, community = null, mode = 'view' } = body;
      if (!Array.isArray(ids) || !ids.length || ids.length > 100 || !ids.every(validId)
          || (community !== null && !validId(community)) || !['view','hermanos','ficha','todo'].includes(mode)
          || (mode === 'view' ? ids.length !== 1 : community === null))
        return response(400, { error: 'Consulta de contactos inválida' });
      const rows = await rpc<{person_id: number; envelope: Envelope | null; migrating:boolean}[]>('read_person_contacts',
        {p_actor: actor, p_ids: ids, p_community: community, p_mode: mode});
      if (rows.some(row => row.migrating)) return response(503, {error: 'Migración de contactos en curso'});
      const key = rows.some(r => r.envelope) ? await contactKey(Deno.env.get('PERSON_CONTACT_KEY_V1')!) : null;
      const contacts = await Promise.all(rows.map(async row => ({
        id: row.person_id, ...(row.envelope && key ? await open(key, row.envelope) : {phone:null, mobile:null})
      })));
      return response(200, { contacts });
    }
    if (body.action === 'prepare') {
      const items = body.items;
      if (!Array.isArray(items) || !items.length || items.length > 100 ||
        !items.every(item => item && (item.id === null || validId(item.id)) && validNumber(item.phone) && validNumber(item.mobile)))
        return response(400, { error: 'Datos de contacto inválidos' });
      const key = await contactKey(Deno.env.get('PERSON_CONTACT_KEY_V1')!);
      const batch = await Promise.all(items.map(async (item: Contact & {id:number|null}) => {
        const ticket = crypto.randomUUID();
        return {ticket, target:item.id, envelope: await seal(key, {phone:item.phone,mobile:item.mobile}, ticket)};
      }));
      await rpc('stage_person_contacts', {p_actor:actor,p_items:batch});
      return response(200, { tickets: batch.map(item => item.ticket) });
    }
    return response(400, { error: 'Acción desconocida' });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') return response(403, {error:'Acceso denegado'});
    return response(503, { error: 'No se pudo completar la operación de contactos' });
  }
});
