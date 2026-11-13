import { Community, Team, Belongs, Parish, CommunityStepLog, Brother } from '@/types/database';
import { MergedBrother } from '@/hooks/useCommunityData';
import { getCarismaLabel, CARISMA_GROUP_ORDER } from '@/config/carisma';
import { formatLocalDate, yearsSince } from '@/lib/dates';

export type PrintMode = 'ficha' | 'hermanos' | 'todo';

interface CommunityPrintViewProps {
  community: Community | null;
  teams: { responsables: Team[]; catequistas: Team[] };
  teamMembers: Record<number, Belongs[]>;
  teamParishes: Record<number, Parish[]>;
  stepLogs: CommunityStepLog[];
  parishPriestName: string | null;
  mergedBrothers: MergedBrother[];
  brothers: Brother[];
  printMode?: PrintMode;
}

interface BrotherListRow {
  name: string;
  mobile: string;
  role?: string;
}

interface BrotherGroup {
  label: string;
  labelPlural: string;
  rows: BrotherListRow[];
}

/** Build the "Responsables" section from team members (team_type_id=4) */
function buildResponsablesSection(
  teams: Team[],
  teamMembers: Record<number, Belongs[]>
): { rows: BrotherListRow[]; personIds: Set<number> } {
  const personIds = new Set<number>();
  const responsables: { member: Belongs; isResp: boolean }[] = [];

  for (const team of teams) {
    const members = team.id ? teamMembers[team.id] || [] : [];
    for (const m of members) {
      if (m.person) {
        responsables.push({ member: m, isResp: m.is_responsible_for_the_team });
      }
    }
  }

  // Sort: responsables first, then corresponsables; within each group by name
  responsables.sort((a, b) => {
    if (a.isResp !== b.isResp) return a.isResp ? -1 : 1;
    return (a.member.person?.person_name || '').localeCompare(
      b.member.person?.person_name || '', 'es', { sensitivity: 'base' }
    );
  });

  // Within responsables, pair husband+wife together (responsible first, then spouse)
  const ordered: { member: Belongs; isResp: boolean }[] = [];
  const processed = new Set<number>();

  for (const entry of responsables) {
    const pId = entry.member.person_id;
    if (processed.has(pId)) continue;
    processed.add(pId);
    ordered.push(entry);

    // Check if this person's spouse is also in the list
    const spouseId = entry.member.person?.spouse_id;
    if (spouseId) {
      const spouseEntry = responsables.find(
        (r) => r.member.person_id === spouseId && !processed.has(r.member.person_id)
      );
      if (spouseEntry) {
        processed.add(spouseEntry.member.person_id);
        ordered.push(spouseEntry);
      }
    }
  }

  const rows: BrotherListRow[] = ordered.map((entry) => {
    const person = entry.member.person!;
    personIds.add(person.id!);
    return {
      name: (entry.isResp ? '[R] ' : '') + person.person_name,
      mobile: person.mobile || '',
      role: entry.isResp ? 'Resp.' : 'Corresp.',
    };
  });

  return { rows, personIds };
}

/** Group remaining brothers by carisma, each person on a separate row */
function buildBrotherGroups(
  brothers: Brother[],
  excludePersonIds: Set<number>
): BrotherGroup[] {
  const PLURAL_LABELS: Record<string, string> = {
    'Matrimonio': 'Matrimonios',
    'Soltero/a': 'Solteros/as',
    'Presbítero': 'Sacerdotes',
    'Diácono': 'Diáconos',
    'Seminarista': 'Seminaristas',
    'Monja': 'Monjas',
    'Viudo/a': 'Viudos/as',
    '': 'Otros',
  };

  // Filter out excluded person IDs and those without a person
  const remaining = brothers.filter(
    (b) => b.person && b.person.id && !excludePersonIds.has(b.person.id)
  );

  // Group by carisma label
  const groupMap = new Map<string, BrotherListRow[]>();

  for (const brother of remaining) {
    const person = brother.person!;
    const carisma = getCarismaLabel(person.person_type_id);
    if (!groupMap.has(carisma)) {
      groupMap.set(carisma, []);
    }
    groupMap.get(carisma)!.push({
      name: person.person_name,
      mobile: person.mobile || '',
    });
  }

  // Sort rows within each group alphabetically
  for (const rows of groupMap.values()) {
    rows.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }

  // Sort groups by CARISMA_GROUP_ORDER
  const sortedEntries = Array.from(groupMap.entries()).sort(
    (a, b) => (CARISMA_GROUP_ORDER[a[0]] ?? 99) - (CARISMA_GROUP_ORDER[b[0]] ?? 99)
  );

  return sortedEntries.map(([carisma, rows]) => ({
    label: carisma,
    labelPlural: PLURAL_LABELS[carisma] || carisma || 'Otros',
    rows,
  }));
}

interface MergedTeamMember {
  id: string;
  name: string;
  carisma: string;
  mobile: string;
  isResponsible: boolean;
  isMarriage: boolean;
}

function mergeTeamMembers(members: Belongs[]): MergedTeamMember[] {
  const processedIds = new Set<number>();
  const merged: MergedTeamMember[] = [];

  members.forEach((member) => {
    if (processedIds.has(member.person_id)) return;
    const person = member.person;
    if (!person) return;

    if (person.spouse_id) {
      const spouseMember = members.find(
        (m) => m.person_id === person.spouse_id && !processedIds.has(m.person_id)
      );

      if (spouseMember && spouseMember.person) {
        const husband = person.gender_id === 1 ? person : spouseMember.person;
        const wife = person.gender_id === 2 ? person : spouseMember.person;

        merged.push({
          id: `marriage-${person.id}-${spouseMember.person_id}`,
          name: `${husband.person_name} y ${wife.person_name}`,
          carisma: 'Matrimonio',
          mobile: husband.mobile || wife.mobile || '',
          isResponsible:
            member.is_responsible_for_the_team || spouseMember.is_responsible_for_the_team,
          isMarriage: true,
        });

        if (person.id) processedIds.add(person.id);
        if (spouseMember.person_id) processedIds.add(spouseMember.person_id);
        return;
      }
    }

    merged.push({
      id: `person-${person.id}`,
      name: person.person_name,
      carisma: getCarismaLabel(person.person_type_id),
      mobile: person.mobile || '',
      isResponsible: member.is_responsible_for_the_team,
      isMarriage: false,
    });

    if (person.id) processedIds.add(person.id);
  });

  return merged.sort((a, b) => {
    if (a.isResponsible !== b.isResponsible) return a.isResponsible ? -1 : 1;
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
  });
}

function formatDate(dateString?: string): string {
  return formatLocalDate(dateString, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function calculateYears(dateString?: string): string {
  const years = yearsSince(dateString);
  return years === null ? '' : `${years} a\u00f1os`;
}

export function CommunityPrintView({
  community,
  teams,
  teamMembers,
  teamParishes,
  stepLogs,
  parishPriestName,
  mergedBrothers,
  brothers,
  printMode = 'todo',
}: CommunityPrintViewProps) {
  if (!community) return null;

  const todayFormatted = new Date().toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // --- Page 3: Lista de Hermanos data ---
  const responsablesSection = buildResponsablesSection(teams.responsables, teamMembers);
  const brotherGroups = buildBrotherGroups(brothers, responsablesSection.personIds);
  const totalBrothers = brothers.filter((b) => b.person).length;

  // Current catechist team (responsible names)
  const cathechistTeam = community.cathechist_team as any;
  const catechistTeamNames: string = cathechistTeam?.belongs
    ? cathechistTeam.belongs
        .filter((b: any) => b.is_responsible_for_the_team)
        .map((b: any) => b.person?.person_name)
        .filter(Boolean)
        .join(' y ')
    : '';

  // Itinerant catechists from most recent step log
  const lastStepLog = stepLogs.length > 0 ? stepLogs[0] : null;
  const _itinerantCatechists = lastStepLog?.principal_catechist_name
    ? lastStepLog.principal_catechist_name
        .split(/[,;y]/)
        .map((n) => n.trim())
        .filter((n) => n !== '')
    : [];

  // Itinerantes, presbíteros and monjas from brothers list
  const itinerantesBrothers = mergedBrothers
    .filter((b) => b.isItinerante)
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  const presbiteros = mergedBrothers
    .filter((b) => b.isPresbitero)
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  // All catechists who have accompanied (for summary in bitacora page)
  const allCatechistsSet = new Set<string>();
  stepLogs.forEach((log) => {
    if (log.principal_catechist_name) {
      log.principal_catechist_name
        .split(/[,;y]/)
        .map((n) => n.trim())
        .filter((n) => n !== '')
        .forEach((n) => allCatechistsSet.add(n));
    }
  });
  const allAccompanyingCatechists = Array.from(allCatechistsSet).sort((a, b) =>
    a.localeCompare(b, 'es', { sensitivity: 'base' })
  );

  return (
    <div className="hidden print:block pv">
      {/* ════════════════════════════════════════════════════ */}
      {/* PÁGINA 1 — DASHBOARD DE LA COMUNIDAD                */}
      {/* ════════════════════════════════════════════════════ */}

      {(printMode === 'ficha' || printMode === 'todo') && (<>
      {/* Header */}
      <header className="pv-header">
        <div className="pv-header-left">
          <h1 className="pv-title">
            Ficha de Comunidad {community.number}
          </h1>
          <p className="pv-subtitle">
            {community.parish?.name || 'Parroquia no especificada'}
          </p>
        </div>
        <div className="pv-date-badge">
          <span className="pv-date-badge-label">Actualizado al</span>
          <span className="pv-date-badge-value">{todayFormatted}</span>
        </div>
      </header>

      {/* Bloque Parroquia */}
      <div className="pv-parish-block">
        <div className="pv-parish-item pv-parish-item--wide">
          <span className="pv-parish-label">Parroquia</span>
          <span className="pv-parish-value">
            {community.parish?.name || 'No especificada'}
          </span>
        </div>
        <div className="pv-parish-item">
          <span className="pv-parish-label">P&aacute;rroco</span>
          <span className="pv-parish-value">
            {parishPriestName || 'No registrado'}
          </span>
        </div>
        <div className="pv-parish-item">
          <span className="pv-parish-label">Tel&eacute;fono</span>
          <span className="pv-parish-value">
            {community.parish?.phone || '\u2014'}
          </span>
        </div>
      </div>

      {/* Información Básica — Grid 3 columnas */}
      <div className="pv-info-grid">
        <div className="pv-info-cell">
          <span className="pv-info-label">Fecha de Nacimiento</span>
          <span className="pv-info-value">
            {formatDate(community.born_date)}
            {community.born_date && ` (${calculateYears(community.born_date)})`}
          </span>
        </div>
        <div className="pv-info-cell">
          <span className="pv-info-label">Etapa Actual</span>
          <span className={`pv-info-value${!community.step_way?.name ? ' pv-info-value--muted' : ''}`}>
            {community.step_way?.name || 'No especificada'}
          </span>
        </div>
        <div className="pv-info-cell">
          <span className="pv-info-label">Hermanos Actuales</span>
          <span className={`pv-info-value${!community.actual_brothers ? ' pv-info-value--muted' : ''}`}>
            {community.actual_brothers || 'No especificado'}
          </span>
        </div>
        <div className="pv-info-cell">
          <span className="pv-info-label">Hermanos Iniciales</span>
          <span className={`pv-info-value${!community.born_brothers ? ' pv-info-value--muted' : ''}`}>
            {community.born_brothers || 'No especificado'}
          </span>
        </div>
        <div className="pv-info-cell">
          <span className="pv-info-label">&Uacute;ltima Etapa</span>
          <span className="pv-info-value">
            {formatDate(community.last_step_way_date)}
          </span>
        </div>
        <div className="pv-info-cell">
          <span className="pv-info-label">Equipo de Catequistas</span>
          <span className={`pv-info-value${!catechistTeamNames ? ' pv-info-value--muted' : ''}`}>
            {catechistTeamNames || 'No asignado'}
          </span>
        </div>
        {allAccompanyingCatechists.length > 0 && (
          <div className="pv-info-cell pv-info-cell--full">
            <span className="pv-info-label">Catequistas que han acompa&ntilde;ado</span>
            <span className="pv-info-value pv-info-value--light">
              {allAccompanyingCatechists.join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Equipos — Grid de 2 columnas */}
      <section className="pv-section">
        <h2 className="pv-section-title">Equipos</h2>
        <div className="pv-teams-grid">
          {/* Col 1: Responsables + Itinerantes */}
          <div className="pv-team-col">
            {/* Responsables */}
            <div className="pv-team-heading">Responsables</div>
            {teams.responsables.length > 0 ? (
              teams.responsables.map((team) => {
                const members = mergeTeamMembers(team.id ? teamMembers[team.id] || [] : []);
                return (
                  <ul key={team.id} className="pv-team-list">
                    {members.length === 0 ? (
                      <li className="pv-team-empty">Sin miembros</li>
                    ) : (
                      members.map((m) => (
                        <li key={m.id}>
                          {m.isResponsible && (
                            <span className="pv-badge-r">R</span>
                          )}
                          <span className="pv-member-name">{m.name}</span>
                          {m.mobile && m.carisma !== 'Seminarista' && (
                            <span className="pv-member-phone">{m.mobile}</span>
                          )}
                        </li>
                      ))
                    )}
                  </ul>
                );
              })
            ) : (
              <p className="pv-team-empty">No hay equipo</p>
            )}

            {/* Itinerantes (debajo de responsables) */}
            <div className="pv-team-heading pv-team-heading--spaced">Itinerantes</div>
            {itinerantesBrothers.length > 0 ? (
              <ul className="pv-team-list">
                {itinerantesBrothers.map((b) => (
                  <li key={b.id}>
                    <span className="pv-member-name">{b.name}</span>
                    {b.celular && (
                      <span className="pv-member-phone">{b.celular}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pv-team-empty">No registrados</p>
            )}

            {/* Presbíteros */}
            {presbiteros.length > 0 && (
              <>
                <div className="pv-team-heading pv-team-heading--spaced">Presb&iacute;teros</div>
                <ul className="pv-team-list">
                  {presbiteros.map((p) => (
                    <li key={p.id}>
                      <span className="pv-member-name">{p.name}</span>
                      {p.celular && (
                        <span className="pv-member-phone">{p.celular}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}

          </div>

          {/* Col 2: Catequistas */}
          <div className="pv-team-col">
            <div className="pv-team-heading">Catequistas</div>
            {teams.catequistas.length > 0 ? (
              teams.catequistas.map((team, index) => {
                const members = mergeTeamMembers(team.id ? teamMembers[team.id] || [] : []);
                const parishes = team.id ? teamParishes[team.id] || [] : [];
                return (
                  <div key={team.id}>
                    {teams.catequistas.length > 1 && (
                      <p className="pv-team-sub">Equipo {index + 1}</p>
                    )}
                    {parishes.length > 0 && (
                      <p className="pv-team-sub">
                        {parishes.map((p) => `Lleva ${p.name}`).join(' | ')}
                      </p>
                    )}
                    <ul className="pv-team-list">
                      {members.length === 0 ? (
                        <li className="pv-team-empty">Sin miembros</li>
                      ) : (
                        members.map((m) => (
                          <li key={m.id}>
                            {m.isResponsible && (
                              <span className="pv-badge-r">R</span>
                            )}
                            <span className="pv-member-name">{m.name}</span>
                            {m.carisma && m.carisma !== 'Matrimonio' && (
                              <span className="pv-member-role">{m.carisma}</span>
                            )}
                            {m.mobile && m.carisma !== 'Seminarista' && (
                              <span className="pv-member-phone">{m.mobile}</span>
                            )}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                );
              })
            ) : (
              <p className="pv-team-empty">No hay equipos</p>
            )}
          </div>
        </div>
      </section>

      {/* Footer Página 1 */}
      <div className="pv-footer">
        ComunidadCat &mdash; Documento generado el {todayFormatted}
      </div>

      {/* ════════════════════════════════════════════════════ */}
      {/* PÁGINA 2+ — BITÁCORA (TIMELINE)                     */}
      {/* ════════════════════════════════════════════════════ */}

      <div className="pv-bitacora">
        {/* Header Bitácora */}
        <div className="pv-bitacora-header">
          <h2 className="pv-bitacora-title">Bit&aacute;cora</h2>
          <span className="pv-bitacora-community">
            Comunidad {community.number} &mdash; {community.parish?.name || ''}
          </span>
        </div>

        {/* Tabla compacta */}
        {stepLogs.length > 0 ? (
          <table className="pv-bitacora-table">
            <thead>
              <tr>
                <th className="pv-bt-th">Fecha</th>
                <th className="pv-bt-th">Etapa</th>
                <th className="pv-bt-th">Catequista</th>
                <th className="pv-bt-th pv-bt-th--center">Estado</th>
                <th className="pv-bt-th">Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {stepLogs.map((log) => (
                <tr key={log.id} className="pv-bt-row">
                  <td className="pv-bt-td pv-bt-td--date">
                    {formatDate(log.date_of_step)}
                  </td>
                  <td className="pv-bt-td pv-bt-td--event">
                    {log.step_way?.name || 'Evento'}
                  </td>
                  <td className="pv-bt-td pv-bt-td--catechist">
                    {log.principal_catechist_name || '\u2014'}
                  </td>
                  <td className="pv-bt-td pv-bt-td--center">
                    {log.outcome !== undefined && log.outcome !== null && (
                      <span
                        className={`pv-bt-status ${
                          log.outcome
                            ? 'pv-bt-status--closed'
                            : 'pv-bt-status--open'
                        }`}
                      >
                        {log.outcome ? 'Cerrada' : 'Abierta'}
                      </span>
                    )}
                  </td>
                  <td className="pv-bt-td pv-bt-td--notes">
                    {log.notes || ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="pv-timeline-empty">
            No hay registros en la bit&aacute;cora
          </p>
        )}

        {/* Footer */}
        <div className="pv-footer">
          ComunidadCat &mdash; Documento generado el {todayFormatted}
        </div>
      </div>
      </>)}

      {/* ════════════════════════════════════════════════════ */}
      {/* PÁGINA 3 — LISTA DE HERMANOS                        */}
      {/* ════════════════════════════════════════════════════ */}

      {(printMode === 'hermanos' || printMode === 'todo') && (
      <div className="pv-bl">
        {/* Header */}
        <div className="pv-bl-header">
          <h2 className="pv-bl-title">Lista de Hermanos</h2>
          <span className="pv-bl-community">
            Comunidad {community.number} &mdash; {community.parish?.name || ''}
          </span>
        </div>

        {/* Tabla unificada de hermanos */}
        <table className="pv-bl-table">
          <thead>
            <tr>
              <th className="pv-bl-th pv-bl-th--num">#</th>
              <th className="pv-bl-th">Nombre</th>
              <th className="pv-bl-th">Celular</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              let counter = 0;
              const sections: React.ReactNode[] = [];

              if (responsablesSection.rows.length > 0) {
                sections.push(
                  <tr key="heading-responsables">
                    <td colSpan={3} className="pv-bl-group-cell">Responsables ({responsablesSection.rows.length})</td>
                  </tr>
                );
                responsablesSection.rows.forEach((row, i) => {
                  counter++;
                  sections.push(
                    <tr key={`resp-${i}`} className="pv-bl-row">
                      <td className="pv-bl-td pv-bl-td--num">{counter}</td>
                      <td className="pv-bl-td pv-bl-td--name">{row.name}</td>
                      <td className="pv-bl-td pv-bl-td--phone">{row.mobile}</td>
                    </tr>
                  );
                });
              }

              brotherGroups.forEach((group) => {
                sections.push(
                  <tr key={`heading-${group.label}`}>
                    <td colSpan={3} className="pv-bl-group-cell">{group.labelPlural} ({group.rows.length})</td>
                  </tr>
                );
                group.rows.forEach((row, i) => {
                  counter++;
                  sections.push(
                    <tr key={`${group.label}-${i}`} className="pv-bl-row">
                      <td className="pv-bl-td pv-bl-td--num">{counter}</td>
                      <td className="pv-bl-td pv-bl-td--name">{row.name}</td>
                      <td className="pv-bl-td pv-bl-td--phone">{row.mobile}</td>
                    </tr>
                  );
                });
              });

              return sections;
            })()}
          </tbody>
        </table>

        {/* Total */}
        <div className="pv-bl-total">
          Total: {totalBrothers} hermano{totalBrothers !== 1 ? 's' : ''}
        </div>

        {/* Footer */}
        <div className="pv-footer">
          ComunidadCat &mdash; Documento generado el {todayFormatted}
        </div>
      </div>
      )}
    </div>
  );
}
