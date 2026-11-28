import type { SupabaseClient } from '@supabase/supabase-js';
import type { PrintMode } from '@/components/crud/CommunityPrintView';

export interface PersonContact { id: number; phone: string | null; mobile: string | null }

export async function readContacts(client: SupabaseClient, ids: number[], community: number | null, mode: 'view' | PrintMode) {
  const contacts = new Map<number, PersonContact>();
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await client.functions.invoke<{ contacts: PersonContact[] }>('person-contacts', {
      body: { action: 'read', ids: ids.slice(i,i+100), community, mode }
    });
    if (error || !data) throw new Error('No se pudieron consultar los teléfonos.');
    for (const contact of data.contacts) contacts.set(contact.id, contact);
  }
  return contacts;
}

export async function readPersonContact(client: SupabaseClient, id: number, community: number | null = null) {
  return (await readContacts(client,[id],community,'view')).get(id);
}

type ContactFields = { phone?: unknown; mobile?: unknown };
function normalize(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

// PostgreSQL consumes each opaque ticket atomically with the person's normal
// RLS-protected insert/update. Failed writes leave only an expiring ciphertext.
export async function preparePeople<T extends object>(client: SupabaseClient, rows: T[], target: number | null = null) {
  const items: {id:number|null; phone:string|null; mobile:string|null}[] = [];
  const changed: number[] = [];
  const payloads = rows.map((row, index) => {
    const {phone, mobile, ...rest} = row as T & ContactFields;
    if (('phone' in row || 'mobile' in row) && (target !== null || normalize(phone) || normalize(mobile))) {
      items.push({id:target, phone:normalize(phone), mobile:normalize(mobile)});
      changed.push(index);
    }
    return { ...rest } as Omit<T,'phone'|'mobile'> & {contact_ticket?:string};
  });
  if (items.length) {
    const {data,error} = await client.functions.invoke<{tickets:string[]}>('person-contacts',{
      body:{action:'prepare',items}
    });
    if (error || data?.tickets.length !== items.length) throw new Error('No se pudieron proteger los teléfonos.');
    changed.forEach((index,i) => { payloads[index].contact_ticket = data.tickets[i]; });
  }
  return payloads;
}

export async function preparePerson<T extends object>(client: SupabaseClient, row:T, target:number|null = null) {
  return (await preparePeople(client,[row],target))[0];
}
