import { preparePeople } from '@/lib/personContacts';
import { friendlyError } from '@/lib/supabaseErrors';
import { createClient } from '@/utils/supabase/client';
import { ParsedBrother } from './csv-parser';

export interface UploadProgress {
  current: number;
  total: number;
  phase: 'people' | 'spouses' | 'brothers' | 'team' | 'done';
  phaseLabel: string;
}

export interface UploadResult {
  success: boolean;
  peopleCreated: number;
  brothersLinked: number;
  marriagesLinked: number;
  responsablesAssigned: number;
  errors: string[];
}

export async function executeBulkUpload(
  brothers: ParsedBrother[],
  communityId: number,
  onProgress?: (progress: UploadProgress) => void,
  requestId: string = crypto.randomUUID()
): Promise<UploadResult> {
  const supabase = createClient();
  const total = brothers.length;
  const positions = new Map<string, number>();
  brothers.forEach((brother, i) => {
    const key = brother.nombre.toLowerCase();
    positions.set(key, positions.has(key) ? 0 : i + 1);
  });

  try {
    if (brothers.some(b => b.status === 'error')) throw new Error('Corrige las filas con errores antes de confirmar la carga.');
    const input = brothers.map(b => {
      const spouse = b.carisma === 'Matrimonio' ? positions.get(b.nombreConyuge.toLowerCase()) : undefined;
      if (spouse === 0) throw new Error('Hay varios hermanos con el nombre de un cónyuge. Revisa el archivo.');
      return {
        person_name: b.nombre, email: b.email || null, phone: b.telefono || null,
        mobile: b.celular || null, gender_id: b.genderId, person_type_id: b.personTypeId,
        is_itinerante: b.esItinerante, spouse_position: spouse ?? null, responsable: b.isResponsable,
      };
    });
    const rows = [];
    for (let offset = 0; offset < total; offset += 100) {
      onProgress?.({ current: offset, total, phase: 'people', phaseLabel: 'Preparando contactos...' });
      rows.push(...await preparePeople(supabase, input.slice(offset, offset + 100)));
    }
    onProgress?.({ current: 0, total, phase: 'brothers', phaseLabel: 'Guardando la carga completa...' });
    const { data, error } = await supabase.rpc('import_community_brothers', {
      p_community: communityId, p_request: requestId, p_rows: rows,
    });
    if (error || !data) throw new Error(friendlyError(error, 'No se pudo confirmar la importación.'));
    onProgress?.({ current: total, total, phase: 'done', phaseLabel: 'Completado' });
    return { ...data, success: true, errors: [] };
  } catch (error) {
    return {
      success: false, peopleCreated: 0, brothersLinked: 0, marriagesLinked: 0, responsablesAssigned: 0,
      errors: [error instanceof Error ? error.message : 'No se pudo confirmar la importación.'],
    };
  }
}
