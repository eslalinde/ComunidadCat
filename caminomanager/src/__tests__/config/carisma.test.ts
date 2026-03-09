import { describe, it, expect } from 'vitest';
import {
  CARISMA_OPTIONS,
  NON_MARRIAGE_TYPE_IDS,
  LOCATION_TYPE_IDS,
  getCarismaLabel,
  needsLocationFields,
  CARISMA_BADGE_COLORS,
  CARISMA_GROUP_ORDER,
} from '@/config/carisma';

describe('Carisma Configuration', () => {
  describe('CARISMA_OPTIONS', () => {
    it('should have 7 options', () => {
      expect(CARISMA_OPTIONS.length).toBe(7);
    });

    it('should have sequential numeric values starting from 1', () => {
      CARISMA_OPTIONS.forEach((opt, index) => {
        expect(opt.value).toBe(index + 1);
      });
    });

    it('should include all expected carisma types', () => {
      const labels = CARISMA_OPTIONS.map(o => o.label);
      expect(labels).toContain('Matrimonio');
      expect(labels).toContain('Soltero/a');
      expect(labels).toContain('Presbítero');
      expect(labels).toContain('Seminarista');
      expect(labels).toContain('Diácono');
      expect(labels).toContain('Monja');
      expect(labels).toContain('Viudo/a');
    });

    it('should have unique values', () => {
      const values = CARISMA_OPTIONS.map(o => o.value);
      expect(new Set(values).size).toBe(values.length);
    });
  });

  describe('NON_MARRIAGE_TYPE_IDS', () => {
    it('should include Presbítero, Seminarista, Diácono, Monja', () => {
      expect(NON_MARRIAGE_TYPE_IDS).toEqual([3, 4, 5, 6]);
    });

    it('should NOT include Matrimonio, Soltero/a, Viudo/a', () => {
      expect(NON_MARRIAGE_TYPE_IDS).not.toContain(1); // Matrimonio
      expect(NON_MARRIAGE_TYPE_IDS).not.toContain(2); // Soltero/a
      expect(NON_MARRIAGE_TYPE_IDS).not.toContain(7); // Viudo/a
    });
  });

  describe('LOCATION_TYPE_IDS', () => {
    it('should include Presbítero, Seminarista, Monja', () => {
      expect(LOCATION_TYPE_IDS).toEqual([3, 4, 6]);
    });

    it('should NOT include Diácono', () => {
      expect(LOCATION_TYPE_IDS).not.toContain(5);
    });
  });

  describe('getCarismaLabel', () => {
    it('should return correct label for each type', () => {
      expect(getCarismaLabel(1)).toBe('Matrimonio');
      expect(getCarismaLabel(3)).toBe('Presbítero');
      expect(getCarismaLabel(6)).toBe('Monja');
    });

    it('should return empty string for undefined', () => {
      expect(getCarismaLabel(undefined)).toBe('');
    });

    it('should return empty string for unknown id', () => {
      expect(getCarismaLabel(99)).toBe('');
    });
  });

  describe('needsLocationFields', () => {
    it('should return true for Presbítero (3)', () => {
      expect(needsLocationFields(3)).toBe(true);
    });

    it('should return true for Seminarista (4)', () => {
      expect(needsLocationFields(4)).toBe(true);
    });

    it('should return true for Monja (6)', () => {
      expect(needsLocationFields(6)).toBe(true);
    });

    it('should return false for Matrimonio (1)', () => {
      expect(needsLocationFields(1)).toBe(false);
    });

    it('should return false for Soltero/a (2)', () => {
      expect(needsLocationFields(2)).toBe(false);
    });

    it('should return true when isItinerante is true regardless of type', () => {
      expect(needsLocationFields(1, true)).toBe(true);
      expect(needsLocationFields(2, true)).toBe(true);
      expect(needsLocationFields(undefined, true)).toBe(true);
    });

    it('should return false for null/undefined type without itinerante', () => {
      expect(needsLocationFields(null)).toBe(false);
      expect(needsLocationFields(undefined)).toBe(false);
    });
  });

  describe('CARISMA_BADGE_COLORS', () => {
    it('should have colors for all carisma types plus Itinerante', () => {
      const expectedKeys = [
        'Presbítero', 'Itinerante', 'Seminarista', 'Diácono',
        'Monja', 'Viudo/a', 'Soltero/a', 'Matrimonio',
      ];
      expectedKeys.forEach(key => {
        expect(CARISMA_BADGE_COLORS[key]).toBeDefined();
        expect(CARISMA_BADGE_COLORS[key].bg).toBeTruthy();
        expect(CARISMA_BADGE_COLORS[key].text).toBeTruthy();
      });
    });
  });

  describe('CARISMA_GROUP_ORDER', () => {
    it('should have Matrimonio as first (0)', () => {
      expect(CARISMA_GROUP_ORDER['Matrimonio']).toBe(0);
    });

    it('should have Soltero/a as last named group (6)', () => {
      expect(CARISMA_GROUP_ORDER['Soltero/a']).toBe(6);
    });

    it('should have empty string as fallback group (7)', () => {
      expect(CARISMA_GROUP_ORDER['']).toBe(7);
    });
  });
});
