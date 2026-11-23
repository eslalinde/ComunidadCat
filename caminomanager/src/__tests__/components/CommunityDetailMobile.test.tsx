import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Belongs, Team } from '@/types/database';
import type { MergedBrother } from '@/hooks/useCommunityData';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { DeleteDouble } from '../helpers/modalDoubles';
import { createTableMock } from '../helpers/queryHarness';

const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => db }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, userScope: null }) }));
vi.mock('@/components/crud/ConfirmDeleteDialog', () => ({
  ConfirmDeleteDialog: (p: Parameters<typeof DeleteDouble>[0]) => <DeleteDouble {...p} />,
}));

import { TeamSection } from '@/components/crud/TeamSection';
import { BrothersList } from '@/components/crud/BrothersList';
import { CommunitySectionNav } from '@/components/crud/CommunitySectionNav';

// Phone breakpoint for useIsMobile.
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  const mock = createTableMock({ belongs: { data: [], error: null, count: 1 }, brothers: { data: [], error: null } });
  db.from.mockImplementation(mock.from);
});
afterEach(() => cleanup());

const team: Team = { id: 8, name: 'Responsables', team_type_id: 4, community_id: 10 };
const members: Belongs[] = [
  { id: 11, person_id: 1, team_id: 8, community_id: 10, is_responsible_for_the_team: true, created_at: '2020-01-01', person: { id: 1, person_name: 'Carlos Rodríguez', person_type_id: 3, mobile: '300 123 4567' } },
  { id: 12, person_id: 2, team_id: 8, community_id: 10, is_responsible_for_the_team: false, created_at: '2020-01-01', person: { id: 2, person_name: 'Pedro López', person_type_id: 3 } },
];

describe('TeamSection on phones', () => {
  it('lists members without a table and links their mobile', () => {
    render(<TeamSection team={team} members={members} parishes={[]} communityId={10} onDelete={vi.fn()} onAddMember={vi.fn()} onEditMember={vi.fn()} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Miembros de Equipo de Responsables' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Llamar a 300 123 4567' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', 'https://wa.me/573001234567');
    expect(screen.getByText('Sin celular')).toBeInTheDocument();
    expect(screen.getByText('Responsable')).toBeInTheDocument();
    expect(screen.getByText('Corresponsable')).toBeInTheDocument();
  });

  it('runs member actions from a labelled menu', async () => {
    const user = userEvent.setup();
    const edit = vi.fn();
    render(<TeamSection team={team} members={members} parishes={[]} communityId={10} onDelete={vi.fn()} onEditMember={edit} />);

    await user.click(screen.getByRole('button', { name: 'Acciones para Carlos Rodríguez' }));
    expect(await screen.findByRole('menuitem', { name: 'Quitar responsabilidad' })).toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: 'Editar datos' }));
    expect(edit).toHaveBeenCalledWith(1, [1]);

    await user.click(screen.getByRole('button', { name: 'Acciones para Pedro López' }));
    expect(await screen.findByRole('menuitem', { name: 'Hacer responsable' })).toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: 'Quitar del equipo' }));
    expect(screen.getByText('Confirmar borrado')).toBeInTheDocument();
  });

  it('hides the actions menu for read-only viewers', () => {
    render(<TeamSection team={team} members={members} parishes={[]} communityId={10} />);
    expect(screen.queryByRole('button', { name: /^Acciones para/ })).not.toBeInTheDocument();
  });
});

const brother: MergedBrother = { id: 'b1', name: 'Juan y Ana', personIds: [1, 2], carisma: 'Matrimonio', celular: '', isMarriage: true, isItinerante: true, isPresbitero: false, createdAt: '2020-01-01' };

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('BrothersList on phones', () => {
  it('groups brothers in a list with collapsible carisma headers', () => {
    renderWithQuery(<BrothersList brothers={[brother]} communityId={10} teamMembers={{}} onAdd={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const header = screen.getByRole('button', { name: /Matrimonio/ });
    expect(header).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Juan y Ana')).toBeInTheDocument();
    expect(screen.getByText('Itinerante')).toBeInTheDocument();
    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Juan y Ana')).not.toBeInTheDocument();
  });

  it('asks for confirmation before removing a brother from the menu', async () => {
    const user = userEvent.setup();
    renderWithQuery(<BrothersList brothers={[brother]} communityId={10} teamMembers={{}} onAdd={vi.fn()} onDelete={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Acciones para Juan y Ana' }));
    await user.click(await screen.findByRole('menuitem', { name: /Quitar de la comunidad/ }));
    expect(screen.getByText('Confirmar borrado')).toBeInTheDocument();
  });

  it('disables removal for brothers who belong to a team', async () => {
    const user = userEvent.setup();
    const teamMembers = { 8: [{ person_id: 1, team_id: 8, community_id: 10 } as Belongs] };
    renderWithQuery(<BrothersList brothers={[brother]} communityId={10} teamMembers={teamMembers} onAdd={vi.fn()} onDelete={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Acciones para Juan y Ana' }));
    const remove = await screen.findByRole('menuitem', { name: /Quitar de la comunidad/ });
    expect(remove).toHaveAttribute('aria-disabled', 'true');
    expect(within(remove).getByText('Pertenece a un equipo de la comunidad')).toBeInTheDocument();
  });
});

describe('CommunitySectionNav', () => {
  const sections = [
    { id: 'seccion-a', label: 'Información' },
    { id: 'seccion-b', label: 'Hermanos' },
  ];

  it('jumps to a section and marks it as current', async () => {
    const user = userEvent.setup();
    render(
      <>
        <CommunitySectionNav sections={sections} />
        <div id="seccion-a" />
        <div id="seccion-b" />
      </>,
    );
    const target = document.getElementById('seccion-b')!;
    target.scrollIntoView = vi.fn();
    await user.click(screen.getByRole('button', { name: 'Hermanos' }));
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(screen.getByRole('button', { name: 'Hermanos' })).toHaveAttribute('aria-current', 'location');
  });

  it('renders nothing with a single section', () => {
    const { container } = render(<CommunitySectionNav sections={sections.slice(0, 1)} />);
    expect(container).toBeEmptyDOMElement();
  });
});
