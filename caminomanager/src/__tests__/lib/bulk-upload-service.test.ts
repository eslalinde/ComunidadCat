import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeBulkUpload } from '@/lib/bulk-upload-service';
import { generateCsvTemplate, parseCsvFile, type ParsedBrother } from '@/lib/csv-parser';

const db = vi.hoisted(() => ({ rpc: vi.fn(), functions: { invoke: vi.fn() } }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => db }));

const brother = (nombre: string, overrides: Partial<ParsedBrother> = {}): ParsedBrother => ({
  rowIndex: 0, nombre, telefono: '', celular: '', email: '', carisma: 'Soltero/a',
  personTypeId: 2, genero: 'Masculino', genderId: 1, esItinerante: false,
  nombreConyuge: '', status: 'valid', errors: [], warnings: [], isResponsable: false, ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
  db.functions.invoke.mockImplementation(async (_name, { body }) => ({
    data: { tickets: body.items.map(() => crypto.randomUUID()) },
  }));
  db.rpc.mockImplementation(async (_name, { p_rows }) => ({
    data: { peopleCreated: p_rows.length, brothersLinked: p_rows.length, marriagesLinked: 0, responsablesAssigned: 0 },
  }));
});

describe('importación transaccional de CSV', () => {
  it('envía la plantilla en una RPC con relaciones relativas y contactos protegidos', async () => {
    const { brothers } = await parseCsvFile(new File([generateCsvTemplate()], 'hermanos.csv'));
    const progress = vi.fn();
    const request = crypto.randomUUID();
    const result = await executeBulkUpload(brothers, 10, progress, request);
    expect(result.success).toBe(true);
    expect(db.rpc).toHaveBeenCalledOnce();
    const [name, payload] = db.rpc.mock.calls[0];
    expect(name).toBe('import_community_brothers');
    expect(payload).toMatchObject({ p_community: 10, p_request: request });
    expect(payload.p_rows.map((p: {spouse_position: number | null}) => p.spouse_position)).toEqual([2, 1, null]);
    expect(payload.p_rows).toContainEqual(expect.objectContaining({ contact_ticket: expect.any(String) }));
    for (const row of payload.p_rows) {
      expect(row).not.toHaveProperty('phone');
      expect(row).not.toHaveProperty('mobile');
    }
    expect(progress.mock.lastCall?.[0].phase).toBe('done');
  });

  it('rechaza todo el archivo si contiene una fila inválida', async () => {
    const result = await executeBulkUpload([brother('Ana'), brother('Error', { status: 'error' })], 10);
    expect(result.success).toBe(false);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('mantiene separados a los homónimos', async () => {
    await executeBulkUpload([brother('Ana'), brother('Ana', { isResponsable: true })], 10);
    expect(db.rpc.mock.calls[0][1].p_rows).toEqual([
      expect.objectContaining({ person_name: 'Ana', responsable: false, email: null }),
      expect.objectContaining({ person_name: 'Ana', responsable: true }),
    ]);
  });

  it('rechaza una referencia ambigua antes de guardar', async () => {
    const result = await executeBulkUpload([brother('Ana'), brother('ANA'), brother('Luis', { carisma: 'Matrimonio', nombreConyuge: 'Ana' })], 10);
    expect(result.success).toBe(false);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('no inicia la transacción si falla el último lote de contactos', async () => {
    const rows = Array.from({ length: 101 }, (_, i) => brother(String(i), { telefono: '123' }));
    db.functions.invoke.mockResolvedValueOnce({ data: { tickets: Array(100).fill('opaque') } })
      .mockResolvedValueOnce({ error: { message: 'Offline' } });
    const result = await executeBulkUpload(rows, 10);
    expect(result).toMatchObject({ success: false, peopleCreated: 0 });
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('un rechazo de RLS no anuncia resultados parciales', async () => {
    db.rpc.mockResolvedValueOnce({ data: null, error: { code: '42501' } });
    const result = await executeBulkUpload([brother('Juan')], 10);
    expect(result).toMatchObject({ success: false, peopleCreated: 0, brothersLinked: 0 });
    expect(result.errors).toHaveLength(1);
  });
});
