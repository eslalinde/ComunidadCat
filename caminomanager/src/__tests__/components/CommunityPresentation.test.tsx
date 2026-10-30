import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommunityPrintView } from '@/components/crud/CommunityPrintView';
import { CommunityInfo } from '@/components/crud/CommunityInfo';
import { ParishInfo } from '@/components/crud/ParishInfo';
import type { Belongs, Community, Parish, Person, Team } from '@/types/database';
import type { MergedBrother } from '@/hooks/useCommunityData';

const parish: Parish = { id: 1, name: 'San José', city_id: 1, phone: '123', email: 'p@example.com', address: 'Calle 1', diocese: { name: 'Diócesis Central', type: 'Diócesis' }, zone: { name: 'Norte', city_id: 1 }, city: { name: 'Bogotá', country_id: 1, state: { name: 'Cundinamarca', country_id: 1 }, country: { name: 'Colombia', code: 'CO' } } };
const people: Person[] = [
  { id: 1, person_name: 'Juan', gender_id: 1, spouse_id: 2, person_type_id: 1, mobile: '300' },
  { id: 2, person_name: 'Ana', gender_id: 2, spouse_id: 1, person_type_id: 1 },
  ...[3, 4, 5, 6, 7, 8, 9].map((id) => ({ id, person_name: `Persona ${id}`, person_type_id: id === 9 ? undefined : id, mobile: id % 2 ? '301' : undefined })),
];
const members: Belongs[] = people.map((person, i) => ({ id: i + 1, person_id: person.id!, person, team_id: 1, community_id: 1, is_responsible_for_the_team: i === 0 }));
const team: Team = { id: 1, name: 'Catequistas', community_id: 1, team_type_id: 3 };
const assigned = { ...team, belongs: [...members, { is_responsible_for_the_team: true }], parish_teams: [{ parish }, {}] };
const community: Community = { id: 1, number: '7', parish, born_date: '2000-12-20', actual_brothers: 9, born_brothers: 30, last_step_way_date: '2025-01-01', step_way: { name: 'Segundo escrutinio' }, cathechist_team: assigned };
const props: React.ComponentProps<typeof CommunityPrintView> = {
  community, teams: { responsables: [{ ...team, team_type_id: 4 }, { ...team, id: 7 }], catequistas: [{ ...team, id: 2 }, { ...team, id: 3 }] },
  teamMembers: { 1: members.slice(0, 2), 2: [...members.slice().reverse(), { person_id: 99, team_id: 2, community_id: 1, is_responsible_for_the_team: false }] },
  teamParishes: { 2: [parish] }, parishPriestName: 'Padre José',
  brothers: [...people.map((person) => ({ person_id: person.id!, community_id: 1, person })), { person_id: 99, community_id: 1 }],
  mergedBrothers: people.map((p): MergedBrother => ({ id: String(p.id), name: p.person_name, carisma: '', celular: p.mobile ?? '', isMarriage: false, isPresbitero: p.id === 3 || p.id === 4, isItinerante: p.id === 5 || p.id === 6, personIds: [p.id!], createdAt: null })),
  stepLogs: [{ id: 1, community_id: 1, date_of_step: '2025-01-01', step_way: { name: 'Inicio' }, principal_catechist_name: 'Luis; Marta y Luis, ', outcome: true, notes: 'Celebración' }, { id: 2, community_id: 1, outcome: false }, { id: 3, community_id: 1 }],
};
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('Fichas y listas imprimibles', () => {
  it('combina cónyuges en equipos, separa responsables de hermanos y conserva bitácora', () => {
    render(<CommunityPrintView {...props} />);
    expect(screen.getByText('Ficha de Comunidad 7')).toBeInTheDocument();
    expect(screen.getAllByText('Juan y Ana')).toHaveLength(2);
    expect(screen.getByText('Luis, Marta')).toBeInTheDocument();
    expect(screen.getByText('Cerrada')).toBeInTheDocument(); expect(screen.getByText('Abierta')).toBeInTheDocument();
    expect(screen.getByText('Celebración')).toBeInTheDocument(); expect(screen.getByText('Lleva San José')).toBeInTheDocument();
    const list = screen.getByText('Lista de Hermanos').closest('.pv-bl') as HTMLElement;
    expect(within(list).getByText('[R] Juan')).toBeInTheDocument();
    expect(within(list).getAllByText('Ana')).toHaveLength(1);
    expect(within(list).getByText('Total: 9 hermanos')).toBeInTheDocument();
    expect(within(list).getByText('Responsables (2)')).toBeInTheDocument();
  });
  it.each(['ficha', 'hermanos'] as const)('imprime solamente %s y maneja información incompleta', (printMode) => {
    render(<CommunityPrintView {...props} community={{ number: '1' }} teams={{ responsables: [], catequistas: [] }} teamMembers={{}} brothers={[]} mergedBrothers={[]} stepLogs={[]} printMode={printMode} parishPriestName={null} />);
    expect(Boolean(screen.queryByText('Ficha de Comunidad 1'))).toBe(printMode === 'ficha');
    expect(Boolean(screen.queryByText('Lista de Hermanos'))).toBe(printMode === 'hermanos');
    if (printMode === 'ficha') { expect(screen.getByText('No hay registros en la bitácora')).toBeInTheDocument(); expect(screen.getByText('No registrado')).toBeInTheDocument(); }
    else expect(screen.getByText('Total: 0 hermanos')).toBeInTheDocument();
  });
  it('no imprime una comunidad inexistente', () => { const { container } = render(<CommunityPrintView {...props} community={null} />); expect(container).toBeEmptyDOMElement(); });
  it('muestra información, edad antes y después del aniversario, y permite editar', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-30T12:00:00Z'));
    const edit = vi.fn(); const view = render(<CommunityInfo community={community} onEdit={edit} />);
    expect(screen.getByText('(25 años)')).toBeInTheDocument(); expect(screen.getByText('Juan - San José')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Editar')); expect(edit).toHaveBeenCalledOnce();
    view.rerender(<CommunityInfo community={{ ...community, born_date: '2000-01-01', cathechist_team: team }} />);
    expect(screen.getByText('(26 años)')).toBeInTheDocument(); expect(screen.getByText('Catequistas')).toBeInTheDocument();
    view.rerender(<CommunityInfo community={{ number: '1' }} />); expect(screen.getByText('No asignado')).toBeInTheDocument();
    view.rerender(<CommunityInfo community={null} loading />); expect(screen.getByText('Cargando información...')).toBeInTheDocument();
    view.rerender(<CommunityInfo community={null} />); expect(screen.getByText('No se encontró información de la comunidad')).toBeInTheDocument();
  });
  it('muestra datos geográficos y estados vacíos de parroquia', () => {
    const edit = vi.fn(); const view = render(<ParishInfo parish={parish} onEdit={edit} />);
    for (const value of ['San José', 'Bogotá', 'Colombia', 'Cundinamarca', 'Norte', 'p@example.com']) expect(screen.getByText(value)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Editar')); expect(edit).toHaveBeenCalledOnce();
    view.rerender(<ParishInfo parish={{ name: 'Vacía', city_id: 1 }} />); expect(screen.getAllByText('No especificada').length).toBeGreaterThan(1);
    view.rerender(<ParishInfo parish={null} loading />); expect(screen.getByText('Cargando información...')).toBeInTheDocument();
    view.rerender(<ParishInfo parish={null} />); expect(screen.getByText('No se encontró información de la parroquia')).toBeInTheDocument();
  });
});
