import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { AppRole, UserScope } from '@/lib/permissions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeScope(role: AppRole, overrides?: Partial<UserScope>): UserScope {
  return {
    role,
    person_id: 1,
    zone_id: role === 'zone_leader' || role === 'zone_contributor' ? 10 : null,
    community_id: role === 'community_responsible' ? 1 : null,
    has_community_grants: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockCommunity = {
  id: 1,
  number: '42',
  born_date: '2020-01-15',
  born_brothers: 30,
  actual_brothers: 25,
  parish_id: 10,
  step_way_id: 3,
  last_step_way_date: '2024-06-01',
  cathechist_team_id: 5,
  parish: { id: 10, name: 'Parroquia San José' },
  step_way: { id: 3, name: 'Segundo Escrutinio' },
  cathechist_team: {
    id: 5,
    name: 'Equipo 1',
    belongs: [
      {
        is_responsible_for_the_team: true,
        person: { person_name: 'Carlos', spouse: { person_name: 'María' } },
      },
    ],
  },
};

const mockTeams = {
  responsables: [{ id: 100, name: 'Equipo Responsables', team_type_id: 4, community_id: 1 }],
  catequistas: [{ id: 200, name: 'Equipo Catequistas 1', team_type_id: 3, community_id: 1 }],
};

const mockMergedBrothers = [
  { id: 'person-1', name: 'Juan', carisma: 'Soltero', celular: '123', isMarriage: false, isPresbitero: false, isItinerante: false, personIds: [1] },
  { id: 'marriage-2-3', name: 'Pedro y Ana', carisma: 'Matrimonio', celular: '456', isMarriage: true, isPresbitero: false, isItinerante: false, personIds: [2, 3] },
];

const mockStepLogs = [
  { id: 1, community_id: 1, step_way_id: 3, date: '2024-06-01', step_way: { id: 3, name: 'Segundo Escrutinio' } },
];

// ---------------------------------------------------------------------------
// matchMedia mock
// ---------------------------------------------------------------------------

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  // mock window.print
  window.print = vi.fn();
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams('id=1');

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

// Supabase mock builder
const mockSupabaseChain = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: {}, error: null }),
  // Default resolved values for chained calls
  then: undefined as any,
};
// Make the chain thenable for await calls
const resolvedChain = { data: [mockCommunity], error: null, count: 1 };
mockSupabaseChain.select.mockReturnValue({
  ...mockSupabaseChain,
  then: (resolve: any) => resolve(resolvedChain),
  eq: vi.fn().mockReturnValue({
    ...mockSupabaseChain,
    then: (resolve: any) => resolve(resolvedChain),
    select: vi.fn().mockReturnValue({
      then: (resolve: any) => resolve(resolvedChain),
    }),
  }),
});

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => mockSupabaseChain,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Auth mock - we'll change userScope per test
let mockUserScope: UserScope | null = makeScope('admin');

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userScope: mockUserScope }),
}));

// Feature flag mock
let mockFeatureFlags: Record<string, boolean> = { community_visits: true };

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: (flag: string) => mockFeatureFlags[flag] ?? false,
}));

// Community data mock
const mockInvalidateDetail = vi.fn().mockResolvedValue(undefined);
const mockInvalidateTeams = vi.fn().mockResolvedValue(undefined);
const mockInvalidateTeamMembers = vi.fn().mockResolvedValue(undefined);
const mockInvalidateBrothers = vi.fn().mockResolvedValue(undefined);
const mockInvalidateStepLogs = vi.fn().mockResolvedValue(undefined);
const mockRefreshCommunity = vi.fn().mockResolvedValue(undefined);

let mockCommunityDataOverrides: Record<string, any> = {};

vi.mock('@/hooks/useCommunityData', () => ({
  useCommunityData: () => ({
    community: mockCommunity,
    brothers: [],
    mergedBrothers: mockMergedBrothers,
    teams: mockTeams,
    teamMembers: {},
    teamParishes: {},
    stepLogs: mockStepLogs,
    parishPriestName: 'Padre José',
    loading: false,
    error: null,
    refreshCommunity: mockRefreshCommunity,
    invalidateDetail: mockInvalidateDetail,
    invalidateTeams: mockInvalidateTeams,
    invalidateTeamMembers: mockInvalidateTeamMembers,
    invalidateBrothers: mockInvalidateBrothers,
    invalidateStepLogs: mockInvalidateStepLogs,
    ...mockCommunityDataOverrides,
  }),
}));

vi.mock('@/lib/queryKeys', () => ({
  queryKeys: {
    crud: { table: () => ['crud'] },
    community: { all: ['community'] },
  },
}));

vi.mock('@/lib/routes', () => ({
  routes: { comunidades: '/comunidades' },
}));

vi.mock('@/lib/supabaseErrors', () => ({
  friendlyError: (err: any, fallback: string) => fallback,
}));

// ---------------------------------------------------------------------------
// UI component mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={props.variant} data-size={props.size}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: any) => asChild ? children : <span>{children}</span>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button data-testid="dropdown-item" onClick={onClick}>{children}</button>
  ),
}));

vi.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="arrow-left-icon" />,
  ChevronDown: () => <span data-testid="chevron-down-icon" />,
  Merge: () => <span data-testid="merge-icon" />,
  Plus: () => <span data-testid="plus-icon" />,
  Printer: () => <span data-testid="printer-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/crud/CommunityInfo', () => ({
  CommunityInfo: ({ community, onEdit }: any) => (
    <div data-testid="community-info">
      {onEdit && <button data-testid="community-info-edit" onClick={onEdit}>Editar</button>}
    </div>
  ),
}));

vi.mock('@/components/crud/BrothersList', () => ({
  BrothersList: ({ onDelete, onAdd }: any) => (
    <div data-testid="brothers-list">
      {onDelete && <span data-testid="brothers-can-delete" />}
      {onAdd && <span data-testid="brothers-can-add" />}
    </div>
  ),
}));

vi.mock('@/components/crud/TeamSection', () => ({
  TeamSection: ({ team, onDelete, onAddMember }: any) => (
    <div data-testid={`team-section-${team.id}`}>
      <span>{team.name}</span>
      {onDelete && <span data-testid={`team-can-delete-${team.id}`} />}
      {onAddMember && <span data-testid={`team-can-add-${team.id}`} />}
    </div>
  ),
}));

vi.mock('@/components/crud/CommunityStepLogCompact', () => ({
  CommunityStepLogCompact: ({ readOnly }: any) => (
    <div data-testid="step-log-compact">
      {readOnly && <span data-testid="step-log-readonly" />}
    </div>
  ),
}));

vi.mock('@/components/crud/CommunityPrintView', () => ({
  CommunityPrintView: () => <div data-testid="print-view" />,
}));

vi.mock('@/components/crud/DynamicEntityModal', () => ({
  DynamicEntityModal: ({ open, onClose, onSave }: any) => (
    open ? (
      <div data-testid="edit-modal">
        <button data-testid="edit-modal-close" onClick={onClose}>Cerrar</button>
        <button data-testid="edit-modal-save" onClick={() => onSave({})}>Guardar</button>
      </div>
    ) : null
  ),
}));

vi.mock('@/components/crud/SelectBrotherForTeamModal', () => ({
  SelectBrotherForTeamModal: ({ open }: any) => (
    open ? <div data-testid="select-brother-modal" /> : null
  ),
}));

vi.mock('@/components/crud/ConfirmDeleteDialog', () => ({
  ConfirmDeleteDialog: ({ open, onClose, onConfirm }: any) => (
    open ? (
      <div data-testid="delete-dialog">
        <button data-testid="delete-dialog-confirm" onClick={onConfirm}>Confirmar</button>
        <button data-testid="delete-dialog-cancel" onClick={onClose}>Cancelar</button>
      </div>
    ) : null
  ),
}));

vi.mock('@/components/crud/MergeCommunityModal', () => ({
  MergeCommunityModal: ({ open, onClose }: any) => (
    open ? (
      <div data-testid="merge-modal">
        <button data-testid="merge-modal-close" onClick={onClose}>Cerrar</button>
      </div>
    ) : null
  ),
}));

vi.mock('@/components/crud/AuditLogSheet', () => ({
  AuditLogSheet: () => <div data-testid="audit-log-sheet" />,
}));

vi.mock('@/components/crud/CommunityAccessSection', () => ({
  CommunityAccessSection: () => <div data-testid="community-access-section" />,
}));

vi.mock('@/components/crud/CommunityVisits', () => ({
  CommunityVisits: () => <div data-testid="community-visits" />,
}));

vi.mock('@/config/entities', () => ({
  communityConfig: { fields: [] },
}));

// ---------------------------------------------------------------------------
// Import the component under test AFTER all mocks
// ---------------------------------------------------------------------------

import CommunityDetailPage from '@/app/(main)/(protected)/comunidades/detalle/page';

// ---------------------------------------------------------------------------
// Reset helpers between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockUserScope = makeScope('admin');
  mockFeatureFlags = { community_visits: true };
  mockCommunityDataOverrides = {};
});

// ===========================================================================
// 1. Basic rendering
// ===========================================================================

describe('CommunityDetailPage - Basic Rendering', () => {
  it('shows the community title with number', () => {
    render(<CommunityDetailPage />);
    expect(screen.getByText('Comunidad 42')).toBeInTheDocument();
  });

  it('shows the parish name', () => {
    render(<CommunityDetailPage />);
    expect(screen.getByText('Parroquia San José')).toBeInTheDocument();
  });

  it('shows the back button text', () => {
    render(<CommunityDetailPage />);
    expect(screen.getByText('Regresar a Comunidades')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockCommunityDataOverrides = { error: 'Algo salió mal', community: null };
    render(<CommunityDetailPage />);
    expect(screen.getByText(/Algo salió mal/)).toBeInTheDocument();
  });
});

// ===========================================================================
// 2. Role-based permission matrix
// ===========================================================================

describe('CommunityDetailPage - Permission Matrix', () => {
  // ---- Admin: full access ----
  describe('admin role', () => {
    beforeEach(() => { mockUserScope = makeScope('admin'); });

    it('shows print dropdown', () => {
      render(<CommunityDetailPage />);
      expect(screen.getByText('Imprimir')).toBeInTheDocument();
    });

    it('shows merge button', () => {
      render(<CommunityDetailPage />);
      expect(screen.getByText('Fusionar')).toBeInTheDocument();
    });

    it('shows community access section', () => {
      render(<CommunityDetailPage />);
      expect(screen.getByTestId('community-access-section')).toBeInTheDocument();
    });

    it('shows audit log sheet', () => {
      render(<CommunityDetailPage />);
      expect(screen.getByTestId('audit-log-sheet')).toBeInTheDocument();
    });

    it('shows delete button', () => {
      render(<CommunityDetailPage />);
      expect(screen.getByText('Eliminar')).toBeInTheDocument();
    });

    it('shows edit on CommunityInfo', () => {
      render(<CommunityDetailPage />);
      expect(screen.getByTestId('community-info-edit')).toBeInTheDocument();
    });

    it('shows manage actions on TeamSection', () => {
      render(<CommunityDetailPage />);
      expect(screen.getByTestId('team-can-delete-100')).toBeInTheDocument();
      expect(screen.getByTestId('team-can-add-100')).toBeInTheDocument();
    });

    it('shows manage actions on BrothersList', () => {
      render(<CommunityDetailPage />);
      expect(screen.getByTestId('brothers-can-delete')).toBeInTheDocument();
      expect(screen.getByTestId('brothers-can-add')).toBeInTheDocument();
    });

    it('shows step log', () => {
      render(<CommunityDetailPage />);
      expect(screen.getByTestId('step-log-compact')).toBeInTheDocument();
    });

    it('step log is NOT readonly', () => {
      render(<CommunityDetailPage />);
      expect(screen.queryByTestId('step-log-readonly')).not.toBeInTheDocument();
    });

    it('renders DynamicEntityModal (edit)', () => {
      render(<CommunityDetailPage />);
      // Modal exists but is closed initially – the mock returns null when open=false
      // But the component IS rendered (showEdit = true)
      // We verify it opens on click in interaction tests
    });

    it('renders ConfirmDeleteDialog', () => {
      render(<CommunityDetailPage />);
      // Exists but closed initially
      expect(screen.queryByTestId('delete-dialog')).not.toBeInTheDocument();
    });

    it('renders MergeCommunityModal', () => {
      render(<CommunityDetailPage />);
      expect(screen.queryByTestId('merge-modal')).not.toBeInTheDocument();
    });
  });

  // ---- Contributor ----
  describe('contributor role', () => {
    beforeEach(() => { mockUserScope = makeScope('contributor'); });

    it('shows print, merge, access, audit but NOT delete', () => {
      render(<CommunityDetailPage />);
      expect(screen.getByText('Imprimir')).toBeInTheDocument();
      expect(screen.getByText('Fusionar')).toBeInTheDocument();
      expect(screen.getByTestId('community-access-section')).toBeInTheDocument();
      expect(screen.getByTestId('audit-log-sheet')).toBeInTheDocument();
      expect(screen.queryByText('Eliminar')).not.toBeInTheDocument();
    });

    it('can edit community and manage teams', () => {
      render(<CommunityDetailPage />);
      expect(screen.getByTestId('community-info-edit')).toBeInTheDocument();
      expect(screen.getByTestId('team-can-delete-100')).toBeInTheDocument();
    });

    it('can manage brothers', () => {
      render(<CommunityDetailPage />);
      expect(screen.getByTestId('brothers-can-add')).toBeInTheDocument();
    });
  });

  // ---- Zone Leader ----
  describe('zone_leader role', () => {
    beforeEach(() => { mockUserScope = makeScope('zone_leader'); });

    it('shows print, merge, access, audit, delete', () => {
      render(<CommunityDetailPage />);
      expect(screen.getByText('Imprimir')).toBeInTheDocument();
      expect(screen.getByText('Fusionar')).toBeInTheDocument();
      expect(screen.getByTestId('community-access-section')).toBeInTheDocument();
      expect(screen.getByTestId('audit-log-sheet')).toBeInTheDocument();
      expect(screen.getByText('Eliminar')).toBeInTheDocument();
    });

    it('can edit, manage teams and brothers', () => {
      render(<CommunityDetailPage />);
      expect(screen.getByTestId('community-info-edit')).toBeInTheDocument();
      expect(screen.getByTestId('team-can-delete-100')).toBeInTheDocument();
      expect(screen.getByTestId('brothers-can-add')).toBeInTheDocument();
    });
  });

  // ---- Zone Contributor ----
  describe('zone_contributor role', () => {
    beforeEach(() => { mockUserScope = makeScope('zone_contributor'); });

    it('shows print and audit but NOT merge, access, or delete', () => {
      render(<CommunityDetailPage />);
      expect(screen.getByText('Imprimir')).toBeInTheDocument();
      expect(screen.getByTestId('audit-log-sheet')).toBeInTheDocument();
      expect(screen.queryByText('Fusionar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('community-access-section')).not.toBeInTheDocument();
      expect(screen.queryByText('Eliminar')).not.toBeInTheDocument();
    });

    it('can edit community but NOT manage teams', () => {
      render(<CommunityDetailPage />);
      expect(screen.getByTestId('community-info-edit')).toBeInTheDocument();
      expect(screen.queryByTestId('team-can-delete-100')).not.toBeInTheDocument();
    });

    it('can manage brothers', () => {
      render(<CommunityDetailPage />);
      expect(screen.getByTestId('brothers-can-add')).toBeInTheDocument();
    });

    it('shows step log as NOT readonly', () => {
      render(<CommunityDetailPage />);
      expect(screen.getByTestId('step-log-compact')).toBeInTheDocument();
      expect(screen.queryByTestId('step-log-readonly')).not.toBeInTheDocument();
    });
  });

  // ---- Community Responsible ----
  describe('community_responsible role', () => {
    beforeEach(() => { mockUserScope = makeScope('community_responsible'); });

    it('does NOT show merge, access, audit, or delete', () => {
      render(<CommunityDetailPage />);
      expect(screen.queryByText('Fusionar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('community-access-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('audit-log-sheet')).not.toBeInTheDocument();
      expect(screen.queryByText('Eliminar')).not.toBeInTheDocument();
    });

    it('cannot edit community or manage teams', () => {
      render(<CommunityDetailPage />);
      expect(screen.queryByTestId('community-info-edit')).not.toBeInTheDocument();
      expect(screen.queryByTestId('team-can-delete-100')).not.toBeInTheDocument();
    });

    it('can manage brothers', () => {
      render(<CommunityDetailPage />);
      expect(screen.getByTestId('brothers-can-add')).toBeInTheDocument();
    });

    it('does NOT show step log', () => {
      render(<CommunityDetailPage />);
      expect(screen.queryByTestId('step-log-compact')).not.toBeInTheDocument();
    });

    it('shows print dropdown with only hermanos option', () => {
      render(<CommunityDetailPage />);
      // showPrintHermanos is true for community_responsible
      expect(screen.getByText('Imprimir')).toBeInTheDocument();
      expect(screen.getByText('Lista de hermanos')).toBeInTheDocument();
      // Ficha and Todo are NOT shown
      expect(screen.queryByText('Ficha completa')).not.toBeInTheDocument();
      expect(screen.queryByText('Todo')).not.toBeInTheDocument();
    });
  });

  // ---- Viewer with scope ----
  describe('viewer role (with scope)', () => {
    beforeEach(() => {
      mockUserScope = makeScope('viewer', { zone_id: 10, has_community_grants: true });
    });

    it('shows print dropdown with all 3 options', () => {
      render(<CommunityDetailPage />);
      expect(screen.getByText('Imprimir')).toBeInTheDocument();
      expect(screen.getByText('Ficha completa')).toBeInTheDocument();
      expect(screen.getByText('Lista de hermanos')).toBeInTheDocument();
      expect(screen.getByText('Todo')).toBeInTheDocument();
    });

    it('does NOT show merge, access, audit, or delete', () => {
      render(<CommunityDetailPage />);
      expect(screen.queryByText('Fusionar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('community-access-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('audit-log-sheet')).not.toBeInTheDocument();
      expect(screen.queryByText('Eliminar')).not.toBeInTheDocument();
    });

    it('cannot edit community, manage teams, or manage brothers', () => {
      render(<CommunityDetailPage />);
      expect(screen.queryByTestId('community-info-edit')).not.toBeInTheDocument();
      expect(screen.queryByTestId('team-can-delete-100')).not.toBeInTheDocument();
      expect(screen.queryByTestId('brothers-can-add')).not.toBeInTheDocument();
    });

    it('shows step log as readonly', () => {
      render(<CommunityDetailPage />);
      expect(screen.getByTestId('step-log-compact')).toBeInTheDocument();
      expect(screen.getByTestId('step-log-readonly')).toBeInTheDocument();
    });
  });

  // ---- Viewer without scope ----
  describe('viewer role (without scope)', () => {
    beforeEach(() => {
      mockUserScope = makeScope('viewer', {
        zone_id: null,
        community_id: null,
        has_community_grants: false,
      });
    });

    it('does NOT show print dropdown', () => {
      render(<CommunityDetailPage />);
      expect(screen.queryByText('Imprimir')).not.toBeInTheDocument();
    });

    it('does NOT show step log', () => {
      render(<CommunityDetailPage />);
      expect(screen.queryByTestId('step-log-compact')).not.toBeInTheDocument();
    });

    it('shows no management actions', () => {
      render(<CommunityDetailPage />);
      expect(screen.queryByTestId('community-info-edit')).not.toBeInTheDocument();
      expect(screen.queryByText('Fusionar')).not.toBeInTheDocument();
      expect(screen.queryByText('Eliminar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('brothers-can-add')).not.toBeInTheDocument();
    });
  });
});

// ===========================================================================
// 3. Print Dropdown options
// ===========================================================================

describe('CommunityDetailPage - Print Dropdown', () => {
  it('admin sees all 3 print options', () => {
    mockUserScope = makeScope('admin');
    render(<CommunityDetailPage />);
    expect(screen.getByText('Ficha completa')).toBeInTheDocument();
    expect(screen.getByText('Lista de hermanos')).toBeInTheDocument();
    expect(screen.getByText('Todo')).toBeInTheDocument();
  });

  it('community_responsible sees only "Lista de hermanos"', () => {
    mockUserScope = makeScope('community_responsible');
    render(<CommunityDetailPage />);
    expect(screen.queryByText('Ficha completa')).not.toBeInTheDocument();
    expect(screen.getByText('Lista de hermanos')).toBeInTheDocument();
    expect(screen.queryByText('Todo')).not.toBeInTheDocument();
  });

  it('viewer with scope sees all 3 options', () => {
    mockUserScope = makeScope('viewer', { zone_id: 10, has_community_grants: true });
    render(<CommunityDetailPage />);
    expect(screen.getByText('Ficha completa')).toBeInTheDocument();
    expect(screen.getByText('Lista de hermanos')).toBeInTheDocument();
    expect(screen.getByText('Todo')).toBeInTheDocument();
  });

  it('viewer without scope sees no print dropdown', () => {
    mockUserScope = makeScope('viewer', { zone_id: null, community_id: null, has_community_grants: false });
    render(<CommunityDetailPage />);
    expect(screen.queryByText('Imprimir')).not.toBeInTheDocument();
  });
});

// ===========================================================================
// 4. Interactions (admin role)
// ===========================================================================

describe('CommunityDetailPage - Interactions', () => {
  beforeEach(() => { mockUserScope = makeScope('admin'); });

  it('clicking "Editar" on CommunityInfo opens edit modal', async () => {
    const user = userEvent.setup();
    render(<CommunityDetailPage />);

    await user.click(screen.getByTestId('community-info-edit'));
    expect(screen.getByTestId('edit-modal')).toBeInTheDocument();
  });

  it('clicking "Eliminar" opens delete dialog', async () => {
    const user = userEvent.setup();
    render(<CommunityDetailPage />);

    await user.click(screen.getByText('Eliminar'));
    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
  });

  it('clicking "Fusionar" opens merge modal', async () => {
    const user = userEvent.setup();
    render(<CommunityDetailPage />);

    await user.click(screen.getByText('Fusionar'));
    expect(screen.getByTestId('merge-modal')).toBeInTheDocument();
  });

  it('clicking back button navigates to comunidades', async () => {
    const user = userEvent.setup();
    render(<CommunityDetailPage />);

    await user.click(screen.getByText('Regresar a Comunidades'));
    expect(mockPush).toHaveBeenCalledWith('/comunidades');
  });
});

// ===========================================================================
// 5. Feature Flags
// ===========================================================================

describe('CommunityDetailPage - Feature Flags', () => {
  it('shows CommunityVisits when community_visits is enabled', () => {
    mockFeatureFlags = { community_visits: true };
    render(<CommunityDetailPage />);
    expect(screen.getByTestId('community-visits')).toBeInTheDocument();
  });

  it('hides CommunityVisits when community_visits is disabled', () => {
    mockFeatureFlags = { community_visits: false };
    render(<CommunityDetailPage />);
    expect(screen.queryByTestId('community-visits')).not.toBeInTheDocument();
  });
});

// ===========================================================================
// 6. Edge Cases
// ===========================================================================

describe('CommunityDetailPage - Edge Cases', () => {
  it('hides merge button when community has no parish_id', () => {
    mockCommunityDataOverrides = {
      community: { ...mockCommunity, parish_id: null },
    };
    mockUserScope = makeScope('admin');
    render(<CommunityDetailPage />);
    expect(screen.queryByText('Fusionar')).not.toBeInTheDocument();
  });

  it('shows "Crear Equipo de Responsables" when no responsables team exists and canManageTeams', () => {
    mockCommunityDataOverrides = {
      teams: { responsables: [], catequistas: mockTeams.catequistas },
    };
    mockUserScope = makeScope('admin');
    render(<CommunityDetailPage />);
    expect(screen.getByText('Crear Equipo de Responsables')).toBeInTheDocument();
  });

  it('shows read-only placeholder when no responsables team and NOT canManageTeams', () => {
    mockCommunityDataOverrides = {
      teams: { responsables: [], catequistas: mockTeams.catequistas },
    };
    mockUserScope = makeScope('viewer', { zone_id: 10, has_community_grants: true });
    render(<CommunityDetailPage />);
    expect(screen.queryByText('Crear Equipo de Responsables')).not.toBeInTheDocument();
    expect(screen.getByText('No hay equipo de responsables')).toBeInTheDocument();
  });

  it('shows "Crear Equipo de Catequistas" when no catequistas teams and canManageTeams', () => {
    mockCommunityDataOverrides = {
      teams: { responsables: mockTeams.responsables, catequistas: [] },
    };
    mockUserScope = makeScope('admin');
    render(<CommunityDetailPage />);
    expect(screen.getByText('Crear Equipo de Catequistas')).toBeInTheDocument();
  });

  it('shows "Agregar Equipo de Catequistas" button when catequistas exist and canManageTeams', () => {
    mockUserScope = makeScope('admin');
    render(<CommunityDetailPage />);
    expect(screen.getByText('Agregar Equipo de Catequistas')).toBeInTheDocument();
  });

  it('does NOT show "Agregar Equipo de Catequistas" when not canManageTeams', () => {
    mockUserScope = makeScope('zone_contributor');
    render(<CommunityDetailPage />);
    expect(screen.queryByText('Agregar Equipo de Catequistas')).not.toBeInTheDocument();
  });
});
