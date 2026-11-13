// Date helpers that treat database DATE values ("YYYY-MM-DD") as local calendar
// dates. `new Date('2020-05-01')` parses as UTC midnight, which renders as the
// previous day in negative-offset timezones (e.g. Colombia, UTC-5).

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses a date string, treating date-only values as local dates. */
export function parseLocalDate(value: string): Date {
  const match = DATE_ONLY.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(value);
}

/** Formats a date for display in Spanish (Colombia). */
export function formatLocalDate(
  value?: string | null,
  options?: Intl.DateTimeFormatOptions,
  fallback = 'No especificada'
): string {
  if (!value) return fallback;
  const date = parseLocalDate(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('es-CO', options);
}

/** Today's local date as "YYYY-MM-DD" (unlike toISOString, which uses UTC). */
export function todayLocalISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Full years elapsed since the given date (local), or null when missing. */
export function yearsSince(value?: string | null, now: Date = new Date()): number | null {
  if (!value) return null;
  const start = parseLocalDate(value);
  if (Number.isNaN(start.getTime())) return null;
  let years = now.getFullYear() - start.getFullYear();
  const monthDiff = now.getMonth() - start.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < start.getDate())) {
    years -= 1;
  }
  return years;
}
