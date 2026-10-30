import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeBulkUpload } from '@/lib/bulk-upload-service';
import { generateCsvTemplate, parseCsvFile, type ParsedBrother } from '@/lib/csv-parser';

const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => db }));

interface Response { data: unknown; error: { message: string } | null; count?: number | null }
interface Request { table: string; operation: string; payload?: unknown; filters: [string, unknown][] }
let responses: Response[];
let requests: Request[];
const ok = (data: unknown = null, count?: number): Response => ({ data, error: null, count });
const failure = (message: string): Response => ({ data: null, error: { message } });
const brother = (name: string, overrides: Partial<ParsedBrother> = {}): ParsedBrother => ({
  rowIndex: 0, nombre: name, telefono: '', celular: '', email: '', carisma: 'Soltero/a',
  personTypeId: 2, genero: 'Masculino', genderId: 1, esItinerante: false,
  nombreConyuge: '', status: 'valid', errors: [], warnings: [], isResponsable: false, ...overrides,
});

beforeEach(() => {
  requests = [];
  responses = [];
  db.from.mockReset().mockImplementation((table: string) => {
    const request: Request = { table, operation: 'select', filters: [] };
    const query = {
      insert: (payload: unknown) => { request.operation = 'insert'; request.payload = payload; return query; },
      update: (payload: unknown) => { request.operation = 'update'; request.payload = payload; return query; },
      select: () => query,
      eq: (field: string, value: unknown) => { request.filters.push([field, value]); return query; },
      limit: () => query,
      single: () => query,
      then: (...args: Parameters<Promise<Response>['then']>) => {
        requests.push(request);
        const response = responses.shift();
        if (!response) throw new Error(`Respuesta no preparada: ${table}/${request.operation}`);
        return Promise.resolve(response).then(...args);
      },
    };
    return query;
  });
});

describe('carga masiva: servicio real y frontera Supabase simulada', () => {
  it('integra la plantilla CSV con creación, matrimonios y vínculos de comunidad', async () => {
    const { brothers } = await parseCsvFile(new File([generateCsvTemplate()], 'hermanos.csv'));
    responses.push(ok(brothers.map((b, index) => ({ id: index + 1, person_name: b.nombre }))), ok(), ok(), ok(), ok(null, 8), ok());
    const progress = vi.fn();
    const result = await executeBulkUpload(brothers, 10, progress);
    expect(result).toEqual({ success: true, peopleCreated: 3, brothersLinked: 3, marriagesLinked: 1, responsablesAssigned: 0, errors: [] });
    expect(requests.filter((r) => r.table === 'people' && r.operation === 'update')).toEqual([
      { table: 'people', operation: 'update', payload: { spouse_id: 2 }, filters: [['id', 1]] },
      { table: 'people', operation: 'update', payload: { spouse_id: 1 }, filters: [['id', 2]] },
    ]);
    expect(requests.find((r) => r.table === 'brothers' && r.operation === 'insert')?.payload).toEqual([
      { person_id: 1, community_id: 10 }, { person_id: 2, community_id: 10 }, { person_id: 3, community_id: 10 },
    ]);
    // The aggregate must include existing brothers, not just the current upload.
    expect(requests.at(-1)).toEqual({ table: 'communities', operation: 'update', payload: { actual_brothers: 8 }, filters: [['id', 10]] });
    expect(progress.mock.calls.map(([p]) => p.phase)).toEqual(['people', 'people', 'spouses', 'brothers', 'brothers', 'done']);
    expect(responses).toEqual([]);
  });

  it('omite filas inválidas y convierte campos opcionales vacíos a null', async () => {
    responses.push(ok([{ id: 1, person_name: 'Ana' }]), ok(), ok(null, 1), ok());
    const result = await executeBulkUpload([brother('Error', { status: 'error' }), brother('Ana', { status: 'warning' })], 10);
    expect(result.peopleCreated).toBe(1);
    expect(requests[0].payload).toEqual([{ person_name: 'Ana', phone: null, mobile: null, email: null, person_type_id: 2, gender_id: 1, is_itinerante: false }]);
  });

  it('divide en lotes y continúa después de un lote fallido sin vincular personas inexistentes', async () => {
    const brothers = Array.from({ length: 21 }, (_, i) => brother(`Persona ${i}`));
    responses.push(failure('Lote rechazado'), ok([{ id: 21, person_name: 'Persona 20' }]), ok(), ok(null, 1), ok());
    const result = await executeBulkUpload(brothers, 10);
    expect(result).toMatchObject({ success: false, peopleCreated: 1, brothersLinked: 1, errors: ['Error creando personas (lote 1): Lote rechazado'] });
    expect(requests[0].payload).toHaveLength(20);
    expect(requests[1].payload).toHaveLength(1);
    expect(requests[2].payload).toEqual([{ person_id: 21, community_id: 10 }]);
  });

  it('informa error de vínculo de hermanos sin contar filas rechazadas', async () => {
    responses.push(ok([{ id: 1, person_name: 'Ana' }]), failure('Sin permiso'), ok(null, 0), ok());
    const result = await executeBulkUpload([brother('Ana')], 10);
    expect(result).toMatchObject({ success: false, peopleCreated: 1, brothersLinked: 0, errors: ['Error vinculando hermanos (lote 1): Sin permiso'] });
  });

  it('informa un cónyuge ausente sin crear referencias inexistentes', async () => {
    responses.push(ok([{ id: 1, person_name: 'Ana' }]), ok(), ok(null, 1), ok());
    const result = await executeBulkUpload([brother('Ana', { carisma: 'Matrimonio', nombreConyuge: 'Juan' })], 10);
    expect(result).toMatchObject({ success: false, marriagesLinked: 0, errors: [expect.stringContaining('cónyuge "Juan" no encontrado')] });
    expect(requests.filter((r) => r.table === 'people' && r.operation === 'update')).toEqual([]);
  });

  it('no anuncia matrimonio vinculado si falla una de las actualizaciones', async () => {
    const brothers = [brother('Ana', { carisma: 'Matrimonio', nombreConyuge: 'Juan' }), brother('Juan', { carisma: 'Matrimonio', nombreConyuge: 'Ana' })];
    responses.push(ok([{ id: 1, person_name: 'Ana' }, { id: 2, person_name: 'Juan' }]), failure('Sin permiso'), ok(), ok(), ok(null, 2), ok());
    expect(await executeBulkUpload(brothers, 10)).toMatchObject({ success: false, marriagesLinked: 0, errors: ['Error vinculando matrimonio Ana - Juan'] });
  });

  it.each([true, false])('asigna responsables usando equipo existente=%s', async (existing) => {
    responses.push(ok([{ id: 1, person_name: 'Ana' }, { id: 2, person_name: 'Juan' }]), ok(), ok(existing ? [{ id: 4 }] : []));
    if (!existing) responses.push(ok({ number: '7' }), ok({ id: 4 }));
    responses.push(ok(), ok(null, 2), ok());
    const result = await executeBulkUpload([brother('Ana', { isResponsable: true }), brother('Juan', { isResponsable: true })], 10);
    expect(result).toMatchObject({ success: true, responsablesAssigned: 2 });
    expect(requests.find((r) => r.table === 'belongs')?.payload).toEqual([
      { person_id: 1, team_id: 4, community_id: 10, is_responsible_for_the_team: true },
      { person_id: 2, team_id: 4, community_id: 10, is_responsible_for_the_team: false },
    ]);
    expect(requests.filter((r) => r.table === 'teams' && r.operation === 'insert')).toHaveLength(existing ? 0 : 1);
  });

  it('conserva resultados parciales y termina el progreso cuando no puede crear el equipo', async () => {
    responses.push(ok([{ id: 1, person_name: 'Ana' }]), ok(), ok([]), ok(null), failure('Sin permiso'));
    const progress = vi.fn();
    expect(await executeBulkUpload([brother('Ana', { isResponsable: true })], 10, progress)).toMatchObject({ success: false, peopleCreated: 1, brothersLinked: 1, responsablesAssigned: 0, errors: ['Error creando equipo de responsables'] });
    expect(progress.mock.lastCall?.[0].phase).toBe('done');
  });

  it('informa errores al asignar miembros de equipo', async () => {
    responses.push(ok([{ id: 1, person_name: 'Ana' }]), ok(), ok([{ id: 4 }]), failure('Miembro duplicado'), ok(null, 1), ok());
    expect(await executeBulkUpload([brother('Ana', { isResponsable: true })], 10)).toMatchObject({ success: false, responsablesAssigned: 0, errors: ['Error asignando responsables: Miembro duplicado'] });
  });

  it('no sobrescribe el conteo si la consulta del total falla', async () => {
    responses.push(failure('No disponible'));
    expect(await executeBulkUpload([], 10)).toMatchObject({ success: false, errors: ['Error consultando total de hermanos: No disponible'] });
    expect(requests).toHaveLength(1);
  });

  it('informa errores al guardar el total de hermanos', async () => {
    responses.push(ok(null, 8), failure('Sin permiso'));
    expect(await executeBulkUpload([], 10)).toMatchObject({ success: false, errors: ['Error actualizando total de hermanos: Sin permiso'] });
  });
});
