import { describe, it, expect } from 'vitest';
import { toTelHref, toWhatsAppHref, toWhatsAppNumber } from '@/lib/phone';

describe('toTelHref', () => {
  it('keeps only dialable digits', () => {
    expect(toTelHref('(604) 444-5566')).toBe('tel:6044445566');
  });

  it('preserves a leading plus for international numbers', () => {
    expect(toTelHref(' +57 300 123 4567 ')).toBe('tel:+573001234567');
  });

  it('returns null for empty or non-numeric values', () => {
    expect(toTelHref('')).toBeNull();
    expect(toTelHref(null)).toBeNull();
    expect(toTelHref('sin número')).toBeNull();
  });
});

describe('toWhatsAppNumber', () => {
  it('adds the Colombian country code to local mobiles', () => {
    expect(toWhatsAppNumber('300 123 4567')).toBe('573001234567');
  });

  it('accepts numbers that already include a country code', () => {
    expect(toWhatsAppNumber('+34 612 345 678')).toBe('34612345678');
    expect(toWhatsAppNumber('0034 612 345 678')).toBe('34612345678');
  });

  it('rejects landlines and ambiguous numbers', () => {
    expect(toWhatsAppNumber('604 444 5566')).toBeNull();
    expect(toWhatsAppNumber('4445566')).toBeNull();
    expect(toWhatsAppNumber(undefined)).toBeNull();
  });

  it('builds a wa.me link', () => {
    expect(toWhatsAppHref('3001234567')).toBe('https://wa.me/573001234567');
    expect(toWhatsAppHref('6044445566')).toBeNull();
  });
});
