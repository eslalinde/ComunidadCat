import Papa from 'papaparse';
import { CARISMA_OPTIONS } from '@/config/carisma';

export interface CsvBrotherRow {
  nombre: string;
  telefono: string;
  celular: string;
  email: string;
  carisma: string;
  genero: string;
  es_itinerante: string;
  nombre_conyuge: string;
}

export type RowStatus = 'valid' | 'warning' | 'error';

export interface ParsedBrother {
  rowIndex: number;
  nombre: string;
  telefono: string;
  celular: string;
  email: string;
  carisma: string;
  personTypeId: number | null;
  genero: string;
  genderId: number | null;
  esItinerante: boolean;
  nombreConyuge: string;
  status: RowStatus;
  errors: string[];
  warnings: string[];
  isResponsable: boolean;
}

const EXPECTED_COLUMNS = [
  'nombre',
  'telefono',
  'celular',
  'email',
  'carisma',
  'genero',
  'es_itinerante',
  'nombre_conyuge',
];

const CARISMA_MAP: Record<string, number> = {};
CARISMA_OPTIONS.forEach((opt) => {
  CARISMA_MAP[opt.label.toLowerCase()] = opt.value;
});

const GENDER_MAP: Record<string, number> = {
  masculino: 1,
  m: 1,
  femenino: 2,
  f: 2,
};

export function generateCsvTemplate(): string {
  const header = EXPECTED_COLUMNS.join(',');
  const example1 = 'Juan Pérez,3001234567,3001234567,juan@email.com,Matrimonio,Masculino,No,María García';
  const example2 = 'María García,3009876543,3009876543,maria@email.com,Matrimonio,Femenino,No,Juan Pérez';
  const example3 = 'Carlos López,3005555555,3005555555,carlos@email.com,Soltero/a,Masculino,No,';
  return `${header}\n${example1}\n${example2}\n${example3}`;
}

export function downloadCsvTemplate() {
  const csv = generateCsvTemplate();
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'plantilla_hermanos.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export interface ParseResult {
  brothers: ParsedBrother[];
  errors: string[];
}

export function parseCsvFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse<CsvBrotherRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (results) => {
        const globalErrors: string[] = [];

        // Validate columns
        const headers = results.meta.fields || [];
        const missingCols = EXPECTED_COLUMNS.filter(
          (col) => !headers.includes(col)
        );
        if (missingCols.length > 0) {
          globalErrors.push(
            `Columnas faltantes: ${missingCols.join(', ')}. Descarga la plantilla para ver el formato correcto.`
          );
        }

        if (results.data.length === 0) {
          globalErrors.push('El archivo no contiene datos.');
          resolve({ brothers: [], errors: globalErrors });
          return;
        }

        // Parse each row
        const brothers: ParsedBrother[] = results.data.map((row, index) => {
          const errors: string[] = [];
          const warnings: string[] = [];

          const nombre = (row.nombre || '').trim();
          const telefono = (row.telefono || '').trim();
          const celular = (row.celular || '').trim();
          const email = (row.email || '').trim();
          const carismaRaw = (row.carisma || '').trim();
          const generoRaw = (row.genero || '').trim();
          const itineranteRaw = (row.es_itinerante || '').trim().toLowerCase();
          const nombreConyuge = (row.nombre_conyuge || '').trim();

          // Validate required fields
          if (!nombre) {
            errors.push('El nombre es obligatorio');
          }

          // Parse carisma
          let personTypeId: number | null = null;
          let carisma = '';
          if (carismaRaw) {
            const key = carismaRaw.toLowerCase();
            if (CARISMA_MAP[key] !== undefined) {
              personTypeId = CARISMA_MAP[key];
              carisma = CARISMA_OPTIONS.find((o) => o.value === personTypeId)!.label;
            } else {
              errors.push(
                `Carisma "${carismaRaw}" no válido. Opciones: ${CARISMA_OPTIONS.map((o) => o.label).join(', ')}`
              );
            }
          }

          // Parse gender
          let genderId: number | null = null;
          let genero = '';
          if (generoRaw) {
            const key = generoRaw.toLowerCase();
            if (GENDER_MAP[key] !== undefined) {
              genderId = GENDER_MAP[key];
              genero = genderId === 1 ? 'Masculino' : 'Femenino';
            } else {
              errors.push(
                `Género "${generoRaw}" no válido. Opciones: Masculino, Femenino`
              );
            }
          }

          // Parse itinerante
          const esItinerante = ['si', 'sí', 'yes', '1', 'true'].includes(itineranteRaw);

          // Validate marriage consistency
          if (carisma === 'Matrimonio' && !nombreConyuge) {
            errors.push('Los matrimonios deben indicar el nombre del cónyuge');
          }
          if (nombreConyuge && carisma && carisma !== 'Matrimonio') {
            warnings.push('Se indicó cónyuge pero el carisma no es Matrimonio');
          }

          const status: RowStatus =
            errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid';

          return {
            rowIndex: index,
            nombre,
            telefono,
            celular,
            email,
            carisma,
            personTypeId,
            genero,
            genderId,
            esItinerante,
            nombreConyuge,
            status,
            errors,
            warnings,
            isResponsable: false,
          };
        });

        // Cross-validate: check spouse references
        const nameSet = new Set(brothers.map((b) => b.nombre.toLowerCase()));
        brothers.forEach((brother) => {
          if (brother.nombreConyuge) {
            if (!nameSet.has(brother.nombreConyuge.toLowerCase())) {
              brother.warnings.push(
                `El cónyuge "${brother.nombreConyuge}" no se encontró en el archivo. Se creará sin vincular.`
              );
              if (brother.status === 'valid') {
                brother.status = 'warning';
              }
            }
          }
        });

        // Check duplicates within file
        const nameCounts: Record<string, number> = {};
        brothers.forEach((b) => {
          const key = b.nombre.toLowerCase();
          nameCounts[key] = (nameCounts[key] || 0) + 1;
        });
        brothers.forEach((b) => {
          if (nameCounts[b.nombre.toLowerCase()] > 1) {
            // Only warn for non-spouse duplicates
            const isSpouseReference = brothers.some(
              (other) =>
                other.nombreConyuge.toLowerCase() === b.nombre.toLowerCase()
            );
            if (!isSpouseReference) {
              b.warnings.push('Nombre duplicado en el archivo');
              if (b.status === 'valid') {
                b.status = 'warning';
              }
            }
          }
        });

        resolve({ brothers, errors: globalErrors });
      },
      error: (err) => {
        resolve({
          brothers: [],
          errors: [`Error al leer el archivo: ${err.message}`],
        });
      },
    });
  });
}

export function validateBrothersForUpload(brothers: ParsedBrother[]): {
  hasErrors: boolean;
  errorCount: number;
  warningCount: number;
  validCount: number;
  marriageCount: number;
} {
  let errorCount = 0;
  let warningCount = 0;
  let validCount = 0;
  let marriageCount = 0;

  const spouseNames = new Set<string>();

  brothers.forEach((b) => {
    if (b.status === 'error') errorCount++;
    else if (b.status === 'warning') warningCount++;
    else validCount++;

    if (b.carisma === 'Matrimonio' && b.nombreConyuge) {
      const pairKey = [b.nombre, b.nombreConyuge].sort().join('|').toLowerCase();
      spouseNames.add(pairKey);
    }
  });

  marriageCount = spouseNames.size;

  return {
    hasErrors: errorCount > 0,
    errorCount,
    warningCount,
    validCount,
    marriageCount,
  };
}
