import { describe, it, expect } from 'vitest';
import { friendlyError } from '@/lib/supabaseErrors';

describe('friendlyError', () => {
  describe('null/undefined errors', () => {
    it('should return default message for null', () => {
      expect(friendlyError(null)).toBe('Error inesperado. Por favor, inténtalo de nuevo.');
    });

    it('should return fallback message when provided', () => {
      expect(friendlyError(null, 'Custom fallback')).toBe('Custom fallback');
    });
  });

  describe('RLS / Permission errors', () => {
    it('should handle code 42501', () => {
      const error = { code: '42501', message: 'permission denied for table "countries"' };
      const result = friendlyError(error);
      expect(result).toContain('No tienes permisos suficientes');
      expect(result).toContain('países');
    });

    it('should handle row-level security message', () => {
      const error = { message: 'new row violates row-level security policy for table "parishes"' };
      const result = friendlyError(error);
      expect(result).toContain('No tienes permisos suficientes');
      expect(result).toContain('parroquias');
    });

    it('should handle permission denied without table reference', () => {
      const error = { message: 'permission denied' };
      const result = friendlyError(error);
      expect(result).toContain('No tienes permisos suficientes');
      expect(result).toContain('Contacta a un administrador');
    });
  });

  describe('Custom RAISE EXCEPTION', () => {
    it('should pass through Permiso denegado messages', () => {
      const error = { message: 'Permiso denegado: no puede editar esta comunidad' };
      expect(friendlyError(error)).toBe('Permiso denegado: no puede editar esta comunidad');
    });
  });

  describe('Unique constraint (23505)', () => {
    it('should match countries_name_unique', () => {
      const error = { code: '23505', constraint: 'countries_name_unique', detail: '' };
      expect(friendlyError(error)).toBe('Ya existe un país con ese nombre.');
    });

    it('should match dioceses_name_key', () => {
      const error = { code: '23505', constraint: 'dioceses_name_key', detail: '' };
      expect(friendlyError(error)).toBe('Ya existe una diócesis con ese nombre.');
    });

    it('should match communities_number_parish_unique', () => {
      const error = { code: '23505', constraint: 'communities_number_parish_unique', detail: '' };
      expect(friendlyError(error)).toBe('Ya existe una comunidad con ese número en la parroquia seleccionada.');
    });

    it('should fallback to name+country_id+state_id detail match', () => {
      const error = { code: '23505', constraint: 'unknown', detail: 'Key (name, country_id, state_id)=(Test, 1, 2)' };
      expect(friendlyError(error)).toBe('Ya existe una ciudad con ese nombre en el país y departamento seleccionados.');
    });

    it('should fallback to name+country_id detail match', () => {
      const error = { code: '23505', constraint: 'unknown', detail: 'Key (name, country_id)=(Test, 1)' };
      expect(friendlyError(error)).toBe('Ya existe un departamento con ese nombre en el país seleccionado.');
    });

    it('should fallback to generic name match', () => {
      const error = { code: '23505', constraint: 'unknown', detail: 'Key (name)=(Test)' };
      expect(friendlyError(error)).toBe('Ya existe un registro con ese nombre.');
    });

    it('should fallback to generic duplicate message', () => {
      const error = { code: '23505', constraint: 'unknown', detail: 'Key (something)=(x)' };
      expect(friendlyError(error)).toBe('Ya existe un registro con esos datos.');
    });
  });

  describe('FK violation (23503)', () => {
    it('should return friendly FK error message', () => {
      const error = { code: '23503', message: 'foreign key violation' };
      expect(friendlyError(error)).toBe('No se puede realizar esta operación porque hay datos relacionados que lo impiden.');
    });
  });

  describe('Check constraint (23514)', () => {
    it('should return validation error message', () => {
      const error = { code: '23514', message: 'check constraint violation' };
      expect(friendlyError(error)).toBe('Los datos no cumplen con las restricciones de validación.');
    });
  });

  describe('Table does not exist (42P01)', () => {
    it('should return table not found message', () => {
      const error = { code: '42P01', message: 'relation does not exist' };
      expect(friendlyError(error)).toBe('La tabla no existe.');
    });
  });

  describe('Conflict (409)', () => {
    it('should return conflict message', () => {
      const error = { code: '409', message: 'conflict' };
      expect(friendlyError(error)).toBe('Conflicto: Los datos enviados ya existen o violan alguna restricción.');
    });
  });

  describe('Fallback', () => {
    it('should return error message as fallback', () => {
      const error = { code: '99999', message: 'Something unexpected happened' };
      expect(friendlyError(error)).toBe('Something unexpected happened');
    });

    it('should handle string errors', () => {
      expect(friendlyError('Simple error string')).toBe('Simple error string');
    });

    it('should use fallback when no message available', () => {
      const error = { code: '99999' };
      expect(friendlyError(error, 'My fallback')).toBe('My fallback');
    });
  });
});
