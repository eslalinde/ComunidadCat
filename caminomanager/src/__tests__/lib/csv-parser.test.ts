import { describe, expect, it } from 'vitest';
import { generateCsvTemplate, parseCsvFile, validateBrothersForUpload } from '@/lib/csv-parser';

const header = 'nombre,telefono,celular,email,carisma,genero,es_itinerante,nombre_conyuge';
const parse = (contents: string) => parseCsvFile(new File([contents], 'hermanos.csv', { type: 'text/csv' }));

describe('importación CSV con PapaParse real', () => {
  it('la plantilla se importa sin errores y cuenta un matrimonio una sola vez', async () => {
    const result = await parse(generateCsvTemplate());
    expect(result.errors).toEqual([]);
    expect(result.brothers).toHaveLength(3);
    expect(result.brothers.every((b) => b.status === 'valid')).toBe(true);
    expect(validateBrothersForUpload(result.brothers)).toEqual({ hasErrors: false, errorCount: 0, warningCount: 0, validCount: 3, marriageCount: 1 });
  });

  it('acepta BOM, encabezados normalizados, CRLF y comas entre comillas', async () => {
    const result = await parse('\ufeff Nombre ,Telefono,Celular,Email,Carisma,Genero,Es Itinerante,Nombre Conyuge\r\n"Pérez, Juan", 123 ,,,soltero/a,m,SÍ,\r\n');
    expect(result.errors).toEqual([]);
    expect(result.brothers[0]).toMatchObject({ nombre: 'Pérez, Juan', telefono: '123', carisma: 'Soltero/a', genderId: 1, esItinerante: true, status: 'valid' });
  });

  it('rechaza archivos sin datos y señala las columnas ausentes', async () => {
    const empty = await parse(header);
    expect(empty.errors).toContain('El archivo no contiene datos.');
    expect(empty.brothers).toEqual([]);
    const missing = await parse('nombre\nJuan');
    expect(missing.errors).toEqual([expect.stringContaining('Columnas faltantes: telefono, celular, email, carisma, genero, es_itinerante, nombre_conyuge')]);
  });

  it.each([
    [',,,,Soltero/a,M,No,', 'El nombre es obligatorio'],
    ['Juan,,,,Desconocido,M,No,', 'Carisma "Desconocido" no válido'],
    ['Juan,,,,Soltero/a,Otro,No,', 'Género "Otro" no válido'],
    ['Juan,,,,Matrimonio,M,No,', 'Los matrimonios deben indicar el nombre del cónyuge'],
  ])('marca errores de fila: %s', async (row, error) => {
    const { brothers } = await parse(`${header}\n${row}`);
    expect(brothers[0].status).toBe('error');
    expect(brothers[0].errors).toContainEqual(expect.stringContaining(error));
    expect(validateBrothersForUpload(brothers).hasErrors).toBe(true);
  });

  it.each(['si', 'sí', 'yes', '1', 'true', ' SÍ '])('interpreta itinerancia %s', async (value) => {
    const { brothers } = await parse(`${header}\nJuan,,,,Soltero/a,M,${value},`);
    expect(brothers[0].esItinerante).toBe(true);
  });

  it.each(['No', 'false', '0', ''])('interpreta itinerancia negativa %s', async (value) => {
    const { brothers } = await parse(`${header}\nJuan,,,,Soltero/a,F,${value},`);
    expect(brothers[0]).toMatchObject({ genderId: 2, esItinerante: false });
  });

  it('advierte cónyuges ausentes y carisma incompatible sin ocultar errores', async () => {
    const { brothers } = await parse(`${header}\nJuan,,,,Soltero/a,M,No,Ana\nPedro,,,,Matrimonio,Otro,No,Luisa`);
    expect(brothers[0]).toMatchObject({ status: 'warning', warnings: [expect.stringContaining('no es Matrimonio'), expect.stringContaining('no se encontró')] });
    expect(brothers[1].status).toBe('error');
    expect(brothers[1].warnings).toHaveLength(1);
    expect(validateBrothersForUpload(brothers)).toMatchObject({ errorCount: 1, warningCount: 1, validCount: 0 });
  });

  it('detecta nombres duplicados sin distinguir mayúsculas', async () => {
    const { brothers } = await parse(`${header}\nJuan,,,,Soltero/a,M,No,\n JUAN ,,,,Soltero/a,M,No,`);
    expect(brothers.map((b) => b.status)).toEqual(['warning', 'warning']);
    expect(brothers[0].warnings).toContain('Nombre duplicado en el archivo');
  });

  it('permite datos opcionales vacíos e ignora líneas vacías', async () => {
    const { brothers } = await parse(`${header}\n\nJuan,,,,,,,\n\n`);
    expect(brothers).toHaveLength(1);
    expect(brothers[0]).toMatchObject({ status: 'valid', genderId: null, personTypeId: null, isResponsable: false });
    expect(validateBrothersForUpload([])).toEqual({ hasErrors: false, errorCount: 0, warningCount: 0, validCount: 0, marriageCount: 0 });
  });
});
