import { describe, it, expect } from 'vitest';
import { buildZodSchema, buildDefaultValues, prepareFormData } from '@/lib/form-schema';
import type { FormField } from '@/types/database';

describe('form-schema utilities', () => {
  describe('buildZodSchema', () => {
    it('should build schema for text fields', () => {
      const fields: FormField[] = [
        { name: 'name', label: 'Nombre', type: 'text', required: true },
      ];
      const schema = buildZodSchema(fields);
      expect(schema.safeParse({ name: 'Test' }).success).toBe(true);
      expect(schema.safeParse({ name: '' }).success).toBe(false);
    });

    it('should allow empty optional text fields', () => {
      const fields: FormField[] = [
        { name: 'notes', label: 'Notas', type: 'text' },
      ];
      const schema = buildZodSchema(fields);
      expect(schema.safeParse({ notes: '' }).success).toBe(true);
      expect(schema.safeParse({ notes: 'Some text' }).success).toBe(true);
    });

    it('should enforce maxLength', () => {
      const fields: FormField[] = [
        { name: 'code', label: 'Código', type: 'text', maxLength: 2 },
      ];
      const schema = buildZodSchema(fields);
      expect(schema.safeParse({ code: 'CO' }).success).toBe(true);
      expect(schema.safeParse({ code: 'COL' }).success).toBe(false);
    });

    it('should enforce minLength', () => {
      const fields: FormField[] = [
        { name: 'code', label: 'Código', type: 'text', minLength: 2 },
      ];
      const schema = buildZodSchema(fields);
      expect(schema.safeParse({ code: 'CO' }).success).toBe(true);
      expect(schema.safeParse({ code: 'C' }).success).toBe(false);
    });

    it('should validate email fields', () => {
      const fields: FormField[] = [
        { name: 'email', label: 'Email', type: 'email', required: true },
      ];
      const schema = buildZodSchema(fields);
      expect(schema.safeParse({ email: 'test@example.com' }).success).toBe(true);
      expect(schema.safeParse({ email: '' }).success).toBe(false);
    });

    it('should allow empty optional emails', () => {
      const fields: FormField[] = [
        { name: 'email', label: 'Email', type: 'email' },
      ];
      const schema = buildZodSchema(fields);
      expect(schema.safeParse({ email: '' }).success).toBe(true);
      expect(schema.safeParse({ email: 'test@example.com' }).success).toBe(true);
    });

    it('should reject invalid optional emails', () => {
      const fields: FormField[] = [
        { name: 'email', label: 'Email', type: 'email' },
      ];
      const schema = buildZodSchema(fields);
      expect(schema.safeParse({ email: 'not-an-email' }).success).toBe(false);
    });

    it('should handle number fields', () => {
      const fields: FormField[] = [
        { name: 'count', label: 'Count', type: 'number', required: true },
      ];
      const schema = buildZodSchema(fields);
      expect(schema.safeParse({ count: 5 }).success).toBe(true);
    });

    it('should handle optional number fields', () => {
      const fields: FormField[] = [
        { name: 'order', label: 'Orden', type: 'number' },
      ];
      const schema = buildZodSchema(fields);
      expect(schema.safeParse({ order: '' }).success).toBe(true);
      expect(schema.safeParse({ order: null }).success).toBe(true);
    });

    it('should handle checkbox fields', () => {
      const fields: FormField[] = [
        { name: 'active', label: 'Activo', type: 'checkbox' },
      ];
      const schema = buildZodSchema(fields);
      expect(schema.safeParse({ active: true }).success).toBe(true);
      expect(schema.safeParse({ active: false }).success).toBe(true);
    });

    it('should handle select fields', () => {
      const fields: FormField[] = [
        { name: 'type', label: 'Tipo', type: 'select', required: true },
      ];
      const schema = buildZodSchema(fields);
      expect(schema.safeParse({ type: 'option1' }).success).toBe(true);
      expect(schema.safeParse({ type: '' }).success).toBe(false);
    });

    it('should handle date fields', () => {
      const fields: FormField[] = [
        { name: 'born_date', label: 'Fecha', type: 'date', required: true },
      ];
      const schema = buildZodSchema(fields);
      expect(schema.safeParse({ born_date: '2024-01-01' }).success).toBe(true);
      expect(schema.safeParse({ born_date: '' }).success).toBe(false);
    });

    it('should handle custom validation function', () => {
      const fields: FormField[] = [
        {
          name: 'code',
          label: 'Código',
          type: 'text',
          required: true,
          validation: (value) => {
            if (value && value.length !== 2) return 'Must be 2 chars';
            return null;
          },
        },
      ];
      const schema = buildZodSchema(fields);
      expect(schema.safeParse({ code: 'CO' }).success).toBe(true);
      expect(schema.safeParse({ code: 'COL' }).success).toBe(false);
    });
  });

  describe('buildDefaultValues', () => {
    const fields: FormField[] = [
      { name: 'name', label: 'Nombre', type: 'text', required: true },
      { name: 'active', label: 'Activo', type: 'checkbox' },
      { name: 'type_id', label: 'Tipo', type: 'select' },
      { name: 'count', label: 'Cantidad', type: 'number' },
    ];

    it('should return empty defaults when no initial data', () => {
      const defaults = buildDefaultValues(fields);
      expect(defaults).toEqual({
        name: '',
        active: false,
        type_id: '',
        count: '',
      });
    });

    it('should populate from initial data', () => {
      const initial = { name: 'Test', active: true, type_id: 5, count: 10 };
      const defaults = buildDefaultValues(fields, initial);
      expect(defaults.name).toBe('Test');
      expect(defaults.active).toBe(true);
      expect(defaults.type_id).toBe('5'); // select converts to string
      expect(defaults.count).toBe(10);
    });

    it('should handle null initial data', () => {
      const defaults = buildDefaultValues(fields, null);
      expect(defaults.name).toBe('');
      expect(defaults.active).toBe(false);
    });

    it('should convert select values to strings', () => {
      const defaults = buildDefaultValues(fields, { type_id: 0 });
      expect(defaults.type_id).toBe('0');
    });

    it('should handle null select values as empty string', () => {
      const defaults = buildDefaultValues(fields, { type_id: null });
      expect(defaults.type_id).toBe('');
    });
  });

  describe('prepareFormData', () => {
    const fields: FormField[] = [
      { name: 'name', label: 'Nombre', type: 'text', required: true },
      { name: 'country_id', label: 'País', type: 'select' },
      { name: 'active', label: 'Activo', type: 'checkbox' },
      { name: 'count', label: 'Cantidad', type: 'number' },
      { name: 'born_date', label: 'Fecha', type: 'date' },
    ];

    it('should convert _id fields to integers', () => {
      const result = prepareFormData({ country_id: '5' }, fields);
      expect(result.country_id).toBe(5);
    });

    it('should convert empty _id fields to null', () => {
      const result = prepareFormData({ country_id: '' }, fields);
      expect(result.country_id).toBeNull();
    });

    it('should convert null _id fields to null', () => {
      const result = prepareFormData({ country_id: null }, fields);
      expect(result.country_id).toBeNull();
    });

    it('should keep checkbox as boolean', () => {
      const result = prepareFormData({ active: true }, fields);
      expect(result.active).toBe(true);
    });

    it('should convert non-true checkbox to false', () => {
      const result = prepareFormData({ active: '' }, fields);
      expect(result.active).toBe(false);
    });

    it('should convert empty numbers to null', () => {
      const result = prepareFormData({ count: '' }, fields);
      expect(result.count).toBeNull();
    });

    it('should convert number strings to numbers', () => {
      const result = prepareFormData({ count: '42' }, fields);
      expect(result.count).toBe(42);
    });

    it('should convert empty dates to null', () => {
      const result = prepareFormData({ born_date: '' }, fields);
      expect(result.born_date).toBeNull();
    });

    it('should keep valid dates as-is', () => {
      const result = prepareFormData({ born_date: '2024-01-01' }, fields);
      expect(result.born_date).toBe('2024-01-01');
    });

    it('should leave text fields unchanged', () => {
      const result = prepareFormData({ name: 'Test Name' }, fields);
      expect(result.name).toBe('Test Name');
    });
  });
});
