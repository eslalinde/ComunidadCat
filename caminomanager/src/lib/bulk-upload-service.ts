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
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const supabase = createClient();
  const errors: string[] = [];
  let peopleCreated = 0;
  let brothersLinked = 0;
  let marriagesLinked = 0;
  let responsablesAssigned = 0;

  // Filter only valid/warning rows (skip errors)
  const validBrothers = brothers.filter((b) => b.status !== 'error');
  const total = validBrothers.length;

  // Map: lowercase name -> created person id
  const nameToPersonId = new Map<string, number>();

  // Phase 1: Create people records
  onProgress?.({
    current: 0,
    total,
    phase: 'people',
    phaseLabel: 'Creando personas...',
  });

  const BATCH_SIZE = 20;
  for (let i = 0; i < validBrothers.length; i += BATCH_SIZE) {
    const batch = validBrothers.slice(i, i + BATCH_SIZE);
    const peopleData = batch.map((b) => ({
      person_name: b.nombre,
      phone: b.telefono || null,
      mobile: b.celular || null,
      email: b.email || null,
      person_type_id: b.personTypeId,
      gender_id: b.genderId,
      is_itinerante: b.esItinerante,
    }));

    const { data: createdPeople, error } = await supabase
      .from('people')
      .insert(peopleData)
      .select('id, person_name');

    if (error) {
      errors.push(`Error creando personas (lote ${Math.floor(i / BATCH_SIZE) + 1}): ${error.message}`);
      continue;
    }

    createdPeople?.forEach((person) => {
      nameToPersonId.set(person.person_name.toLowerCase(), person.id);
      peopleCreated++;
    });

    onProgress?.({
      current: Math.min(i + BATCH_SIZE, validBrothers.length),
      total,
      phase: 'people',
      phaseLabel: 'Creando personas...',
    });
  }

  // Phase 2: Link spouses
  onProgress?.({
    current: 0,
    total,
    phase: 'spouses',
    phaseLabel: 'Vinculando matrimonios...',
  });

  const processedSpouses = new Set<string>();

  for (const brother of validBrothers) {
    if (brother.carisma !== 'Matrimonio' || !brother.nombreConyuge) continue;

    const pairKey = [brother.nombre, brother.nombreConyuge]
      .sort()
      .join('|')
      .toLowerCase();

    if (processedSpouses.has(pairKey)) continue;
    processedSpouses.add(pairKey);

    const personId = nameToPersonId.get(brother.nombre.toLowerCase());
    const spouseId = nameToPersonId.get(brother.nombreConyuge.toLowerCase());

    if (!personId || !spouseId) {
      if (!spouseId) {
        errors.push(
          `No se pudo vincular matrimonio: cónyuge "${brother.nombreConyuge}" no encontrado.`
        );
      }
      continue;
    }

    // Update both with spouse_id
    const { error: err1 } = await supabase
      .from('people')
      .update({ spouse_id: spouseId })
      .eq('id', personId);

    const { error: err2 } = await supabase
      .from('people')
      .update({ spouse_id: personId })
      .eq('id', spouseId);

    if (err1 || err2) {
      errors.push(
        `Error vinculando matrimonio ${brother.nombre} - ${brother.nombreConyuge}`
      );
    } else {
      marriagesLinked++;
    }
  }

  // Phase 3: Create brother records (link people to community)
  onProgress?.({
    current: 0,
    total,
    phase: 'brothers',
    phaseLabel: 'Vinculando a la comunidad...',
  });

  const brotherInserts = validBrothers
    .map((b) => {
      const personId = nameToPersonId.get(b.nombre.toLowerCase());
      if (!personId) return null;
      return { person_id: personId, community_id: communityId };
    })
    .filter(Boolean) as { person_id: number; community_id: number }[];

  for (let i = 0; i < brotherInserts.length; i += BATCH_SIZE) {
    const batch = brotherInserts.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('brothers').insert(batch);

    if (error) {
      errors.push(
        `Error vinculando hermanos (lote ${Math.floor(i / BATCH_SIZE) + 1}): ${error.message}`
      );
    } else {
      brothersLinked += batch.length;
    }

    onProgress?.({
      current: Math.min(i + BATCH_SIZE, brotherInserts.length),
      total: brotherInserts.length,
      phase: 'brothers',
      phaseLabel: 'Vinculando a la comunidad...',
    });
  }

  // Phase 4: Assign responsables
  const responsables = validBrothers.filter((b) => b.isResponsable);

  if (responsables.length > 0) {
    onProgress?.({
      current: 0,
      total: responsables.length,
      phase: 'team',
      phaseLabel: 'Asignando responsables...',
    });

    // Find or create the responsables team
    const { data: existingTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('community_id', communityId)
      .eq('team_type_id', 4)
      .limit(1);

    let teamId: number;

    if (existingTeams && existingTeams.length > 0) {
      teamId = existingTeams[0].id;
    } else {
      // Get community number for team name
      const { data: comm } = await supabase
        .from('communities')
        .select('number')
        .eq('id', communityId)
        .single();

      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: `Equipo de Responsables - Comunidad ${comm?.number || communityId}`,
          team_type_id: 4,
          community_id: communityId,
        })
        .select()
        .single();

      if (teamError || !newTeam) {
        errors.push('Error creando equipo de responsables');
        onProgress?.({ current: 0, total: 0, phase: 'done', phaseLabel: 'Completado' });
        return {
          success: errors.length === 0,
          peopleCreated,
          brothersLinked,
          marriagesLinked,
          responsablesAssigned,
          errors,
        };
      }
      teamId = newTeam.id;
    }

    // Add responsables to team
    const belongsInserts = responsables
      .map((b, index) => {
        const personId = nameToPersonId.get(b.nombre.toLowerCase());
        if (!personId) return null;
        return {
          person_id: personId,
          team_id: teamId,
          community_id: communityId,
          is_responsible_for_the_team: index === 0, // First one is the team leader
        };
      })
      .filter(Boolean);

    if (belongsInserts.length > 0) {
      const { error } = await supabase.from('belongs').insert(belongsInserts);
      if (error) {
        errors.push(`Error asignando responsables: ${error.message}`);
      } else {
        responsablesAssigned = belongsInserts.length;
      }
    }
  }

  // Update actual_brothers count
  const { data: brotherCount } = await supabase
    .from('brothers')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', communityId);

  if (brotherCount !== null) {
    await supabase
      .from('communities')
      .update({ actual_brothers: brothersLinked })
      .eq('id', communityId);
  }

  onProgress?.({
    current: 0,
    total: 0,
    phase: 'done',
    phaseLabel: 'Completado',
  });

  return {
    success: errors.length === 0,
    peopleCreated,
    brothersLinked,
    marriagesLinked,
    responsablesAssigned,
    errors,
  };
}
