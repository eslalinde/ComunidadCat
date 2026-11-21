/**
 * Phone helpers for one-tap call / WhatsApp links. Numbers are stored as
 * free text, so only build links we can trust.
 */

// Most numbers in the app are Colombian; local mobiles are 10 digits starting with 3.
const DEFAULT_COUNTRY_CODE = '57';
const LOCAL_MOBILE = /^3\d{9}$/;

/** `tel:` URI for a free-text number, or null when it has no dialable digits. */
export function toTelHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 3) return null;
  return `tel:${trimmed.startsWith('+') ? '+' : ''}${digits}`;
}

/**
 * International digits (no "+") usable by wa.me, or null when the number
 * cannot be resolved to a full international mobile number.
 */
export function toWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');

  if (trimmed.startsWith('+')) return digits.length >= 8 ? digits : null;
  if (digits.startsWith('00')) return digits.length >= 10 ? digits.slice(2) : null;
  if (LOCAL_MOBILE.test(digits)) return `${DEFAULT_COUNTRY_CODE}${digits}`;
  return null;
}

export function toWhatsAppHref(raw: string | null | undefined): string | null {
  const number = toWhatsAppNumber(raw);
  return number ? `https://wa.me/${number}` : null;
}
