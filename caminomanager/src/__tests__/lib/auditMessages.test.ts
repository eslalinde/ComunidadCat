import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatAuditEntry, getTableLabel, relativeTime } from '@/lib/auditMessages';
import type { AuditLog } from '@/types/database';

const entry = (overrides: Partial<AuditLog> = {}): AuditLog => ({
  id: 1, user_id: 'user-id', table_name: 'communities', record_id: 10,
  operation: 'UPDATE', community_id: 10, old_values: null, new_values: null,
  changed_columns: null, created_at: '2026-10-30T12:00:00Z', ...overrides,
});

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-30T12:00:00Z')); });
afterEach(() => { vi.useRealTimers(); });

describe('mensajes de auditoría', () => {
  it.each([
    ['communities', 'INSERT', 'Creo una comunidad', 'green'],
    ['communities', 'UPDATE', 'Actualizo la comunidad', 'blue'],
    ['communities', 'DELETE', 'Elimino la comunidad', 'red'],
    ['community_step_log', 'INSERT', 'Registro una entrada en la bitacora', 'green'],
    ['community_step_log', 'UPDATE', 'Actualizo una entrada de la bitacora', 'blue'],
    ['community_step_log', 'DELETE', 'Elimino una entrada de la bitacora', 'red'],
  ] as const)('describe %s %s', (table_name, operation, message, color) => {
    expect(formatAuditEntry(entry({ table_name, operation }))).toMatchObject({ message, color, actorName: 'Usuario desconocido', details: [] });
  });

  it.each([
    ['teams', 'INSERT', 'Creo el equipo "Responsables"', 'Creo un equipo'],
    ['teams', 'UPDATE', 'Actualizo el equipo "Responsables"', 'Actualizo un equipo'],
    ['teams', 'DELETE', 'Elimino el equipo "Responsables"', 'Elimino un equipo'],
    ['brothers', 'INSERT', 'Agrego a Ana a la comunidad', 'Agrego un hermano a la comunidad'],
    ['brothers', 'UPDATE', 'Actualizo a Ana', 'Actualizo un hermano'],
    ['brothers', 'DELETE', 'Elimino a Ana de la comunidad', 'Elimino un hermano de la comunidad'],
    ['belongs', 'INSERT', 'Agrego a Ana al equipo "Responsables"', 'Agrego un miembro al equipo'],
    ['belongs', 'UPDATE', 'Actualizo a Ana en "Responsables"', 'Actualizo un miembro del equipo'],
    ['belongs', 'DELETE', 'Elimino a Ana de "Responsables"', 'Elimino un miembro del equipo'],
  ] as const)('resuelve nombres y datos eliminados: %s %s', (table_name, operation, message, fallback) => {
    const audit = entry({ table_name, operation, old_values: { name: 'Responsables', person_id: 1, team_id: 4 }, user_profile: { full_name: 'Administradora' } });
    expect(formatAuditEntry(audit, { 1: 'Ana' }, { 4: 'Responsables' })).toMatchObject({ message, actorName: 'Administradora' });
    expect(formatAuditEntry(entry({ table_name, operation })).message).toBe(fallback);
  });

  it.each([true, false])('describe cambio de responsabilidad a %s', (responsible) => {
    const audit = entry({ table_name: 'belongs', new_values: { person_id: 1, team_id: 4, is_responsible_for_the_team: responsible }, changed_columns: ['is_responsible_for_the_team'] });
    const verb = responsible ? 'Asigno' : 'Removio';
    expect(formatAuditEntry(audit, { 1: 'Ana' }, { 4: 'Equipo' }).message).toBe(`${verb} como responsable a Ana en "Equipo"`);
    expect(formatAuditEntry(audit).message).toBe(`${verb} como responsable del equipo`);
  });

  it('muestra cambios de negocio, incluidos false, cero y vacíos, omitiendo timestamps', () => {
    const audit = entry({
      changed_columns: ['actual_brothers', 'notes', 'is_responsible_for_the_team', 'custom', 'updated_at', 'created_at'],
      old_values: { actual_brothers: 0, notes: null, is_responsible_for_the_team: false },
      new_values: { actual_brothers: 12, notes: 'Nota', is_responsible_for_the_team: true, custom: '' },
    });
    expect(formatAuditEntry(audit).details).toEqual([
      { label: 'Hermanos actuales', oldValue: '0', newValue: '12' },
      { label: 'Notas', oldValue: '(vacio)', newValue: 'Nota' },
      { label: 'Responsable del equipo', oldValue: 'No', newValue: 'Si' },
      { label: 'custom', oldValue: '(vacio)', newValue: '' },
    ]);
  });

  it('conserva operaciones de tablas desconocidas y tolera fecha ausente', () => {
    expect(formatAuditEntry(entry({ table_name: 'nueva_tabla', created_at: undefined }))).toMatchObject({ message: 'UPDATE en nueva_tabla', relativeTime: 'hace un momento' });
    expect(getTableLabel('brothers')).toBe('Hermanos');
    expect(getTableLabel('nueva_tabla')).toBe('nueva_tabla');
  });
});

it.each([
  [0, 'hace un momento'], [59, 'hace un momento'], [60, 'hace 1 min'],
  [3599, 'hace 59 min'], [3600, 'hace 1h'], [86399, 'hace 23h'],
  [86400, 'ayer'], [172800, 'hace 2 dias'], [518400, 'hace 6 dias'],
])('formatea tiempo relativo en el límite de %s segundos', (seconds, expected) => {
  expect(relativeTime(new Date(Date.now() - seconds * 1000).toISOString())).toBe(expected);
});

it('usa fecha localizada después de una semana', () => {
  const date = new Date('2026-10-20T12:00:00Z');
  expect(relativeTime(date.toISOString())).toBe(date.toLocaleDateString('es', { day: 'numeric', month: 'short' }));
});
