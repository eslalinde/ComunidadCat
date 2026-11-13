import { describe, expect, it } from 'vitest';
import { formatLocalDate, parseLocalDate, todayLocalISO, yearsSince } from './dates';

describe('parseLocalDate', () => {
  it('parses date-only strings as local calendar dates', () => {
    const date = parseLocalDate('2020-05-01');
    expect(date.getFullYear()).toBe(2020);
    expect(date.getMonth()).toBe(4);
    expect(date.getDate()).toBe(1);
  });

  it('falls back to native parsing for timestamps', () => {
    expect(parseLocalDate('2020-05-01T12:00:00Z').toISOString()).toBe('2020-05-01T12:00:00.000Z');
  });
});

describe('formatLocalDate', () => {
  it('keeps the same calendar day', () => {
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
    expect(formatLocalDate('2020-05-01', opts)).toBe(new Date(2020, 4, 1).toLocaleDateString('es-CO', opts));
  });

  it('returns the fallback for empty or invalid values', () => {
    expect(formatLocalDate(undefined)).toBe('No especificada');
    expect(formatLocalDate('', undefined, '-')).toBe('-');
    expect(formatLocalDate('no-es-fecha')).toBe('No especificada');
  });
});

describe('todayLocalISO', () => {
  it('uses the local date, not UTC', () => {
    expect(todayLocalISO(new Date(2026, 10, 12, 23, 30))).toBe('2026-11-12');
    expect(todayLocalISO(new Date(2026, 0, 5, 0, 5))).toBe('2026-01-05');
  });
});

describe('yearsSince', () => {
  const now = new Date(2026, 4, 1);

  it('counts full years including the anniversary day', () => {
    expect(yearsSince('2020-05-01', now)).toBe(6);
    expect(yearsSince('2020-05-02', now)).toBe(5);
  });

  it('returns null for missing or invalid values', () => {
    expect(yearsSince(null, now)).toBeNull();
    expect(yearsSince('x', now)).toBeNull();
  });
});
