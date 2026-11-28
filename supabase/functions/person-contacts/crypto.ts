export interface Contact { phone: string | null; mobile: string | null }
export interface Envelope { version: 1; binding: string; iv: string; data: string }

const utf8 = new TextEncoder();
function decode(value: string) {
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}
function encode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}
export async function contactKey(secret: string) {
  const bytes = decode(secret);
  if (bytes.length !== 32) throw new Error('Clave de contacto inválida');
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt','decrypt']);
}
export async function seal(key: CryptoKey, contact: Contact, binding: string): Promise<Envelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: utf8.encode(binding) }, key, utf8.encode(JSON.stringify(contact)));
  return { version: 1, binding, iv: encode(iv), data: encode(new Uint8Array(data)) };
}
export async function open(key: CryptoKey, envelope: Envelope): Promise<Contact> {
  if (envelope.version !== 1) throw new Error('Versión de cifrado desconocida');
  const bytes = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: decode(envelope.iv), additionalData: utf8.encode(envelope.binding) },
    key, decode(envelope.data));
  return JSON.parse(new TextDecoder().decode(bytes));
}
