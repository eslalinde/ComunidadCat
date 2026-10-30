import { describe, expect, it } from 'vitest';
import * as permissions from '@/lib/permissions';
import type { AppRole, UserScope } from '@/lib/permissions';

function scope(role: AppRole, overrides: Partial<UserScope> = {}): UserScope {
  return { role, person_id: null, zone_id: null, community_id: null, has_community_grants: false, ...overrides };
}

// Expected capabilities are a business contract, independent of implementation.
const actions = {
  admin: permissions.canAccessAdmin,
  edit: permissions.canEditCommunity,
  delete: permissions.canDeleteCommunity,
  merge: permissions.canMergeCommunity,
  brothers: permissions.canManageBrothers,
  teams: permissions.canManageTeams,
  audit: permissions.canViewAuditLog,
  viewSteps: permissions.canViewStepLog,
  editSteps: permissions.canEditStepLog,
  ficha: permissions.canPrintFicha,
  printBrothers: permissions.canPrintHermanos,
  printAll: permissions.canPrintTodo,
  parishes: permissions.canManageParishes,
  priests: permissions.canManagePriests,
  masterData: permissions.canWriteMasterData,
  grants: permissions.canManageCommunityAccess,
};
type Action = keyof typeof actions;
const contracts: { name: string; user: UserScope | null; allowed: Action[]; sections: string[] }[] = [
  { name: 'sin sesión', user: null, allowed: [], sections: [] },
  { name: 'administrador', user: scope('admin'), allowed: Object.keys(actions) as Action[], sections: ['principal', 'comunidades', 'parroquias', 'personas', 'organizacion', 'ubicaciones', 'reportes', 'admin'] },
  { name: 'contribuidor', user: scope('contributor'), allowed: ['edit', 'merge', 'brothers', 'teams', 'audit', 'viewSteps', 'editSteps', 'ficha', 'printBrothers', 'printAll', 'parishes', 'priests', 'masterData', 'grants'], sections: ['principal', 'comunidades', 'parroquias', 'personas', 'organizacion', 'ubicaciones', 'reportes'] },
  { name: 'jefe de zona', user: scope('zone_leader', { zone_id: 1 }), allowed: ['edit', 'delete', 'merge', 'brothers', 'teams', 'audit', 'viewSteps', 'editSteps', 'ficha', 'printBrothers', 'printAll', 'parishes', 'priests', 'grants'], sections: ['principal', 'comunidades', 'parroquias', 'personas', 'reportes'] },
  { name: 'contribuidor de zona', user: scope('zone_contributor', { zone_id: 1 }), allowed: ['edit', 'brothers', 'audit', 'viewSteps', 'editSteps', 'ficha', 'printBrothers', 'printAll'], sections: ['principal', 'comunidades', 'parroquias', 'personas'] },
  { name: 'responsable', user: scope('community_responsible', { community_id: 10 }), allowed: ['brothers', 'printBrothers'], sections: ['principal', 'comunidades'] },
  { name: 'viewer sin alcance', user: scope('viewer'), allowed: [], sections: ['principal'] },
  { name: 'viewer zona', user: scope('viewer', { zone_id: 1 }), allowed: ['viewSteps', 'ficha', 'printBrothers', 'printAll'], sections: ['principal', 'comunidades', 'parroquias'] },
  { name: 'viewer comunidad', user: scope('viewer', { community_id: 10 }), allowed: ['viewSteps', 'ficha', 'printBrothers', 'printAll'], sections: ['principal', 'comunidades'] },
  { name: 'viewer con acceso adicional', user: scope('viewer', { has_community_grants: true }), allowed: ['viewSteps', 'ficha', 'printBrothers', 'printAll'], sections: ['principal', 'comunidades'] },
  { name: 'viewer zona y comunidad', user: scope('viewer', { zone_id: 1, community_id: 10 }), allowed: ['viewSteps', 'ficha', 'printBrothers', 'printAll'], sections: ['principal', 'comunidades', 'parroquias'] },
];

const routeSections: Record<string, string> = {
  '/admin': 'admin', '/admin/usuarios': 'admin',
  '/reportes': 'reportes', '/reportes/presbiteros': 'reportes',
  '/diocesis': 'organizacion', '/equipo-nacional': 'organizacion',
  '/etapas': 'organizacion', '/tipos-equipo': 'organizacion', '/tipos-inventario': 'organizacion',
  '/paises': 'ubicaciones', '/departamentos': 'ubicaciones', '/ciudades': 'ubicaciones', '/zonas': 'ubicaciones',
  '/personas': 'personas', '/parroquias/detalle': 'parroquias', '/comunidades/detalle': 'comunidades',
};

describe.each(contracts)('Permisos: $name', ({ user, allowed, sections }) => {
  it('habilita exactamente las acciones autorizadas', () => {
    for (const [name, check] of Object.entries(actions)) {
      expect(check(user), name).toBe(allowed.includes(name as Action));
    }
  });

  it('muestra exactamente las secciones autorizadas', () => {
    const visible = Object.entries(permissions.getSidebarVisibility(user)).filter(([, value]) => value).map(([key]) => key);
    expect(visible.sort()).toEqual([...sections].sort());
  });

  it('protege navegación directa, incluyendo rutas de detalle', () => {
    for (const [route, section] of Object.entries(routeSections)) {
      expect(permissions.canAccessRoute(user, route), route).toBe(sections.includes(section));
    }
    for (const route of ['/', '/cuenta', '/pagina-inexistente']) {
      expect(permissions.canAccessRoute(user, route), route).toBe(user !== null);
    }
  });
});

it.each([
  ['admin', false, false, false, 'Administrador'],
  ['contributor', false, false, false, 'Contribuidor'],
  ['zone_leader', true, false, false, 'Jefe de Zona'],
  ['zone_contributor', true, false, false, 'Contribuidor Zona'],
  ['community_responsible', false, true, false, 'Responsable de Comunidad'],
  ['viewer', false, false, true, 'Visualizador'],
] as const)('valida alcance y etiqueta de %s', (role, zone, community, optional, label) => {
  expect(permissions.roleRequiresZone(role)).toBe(zone);
  expect(permissions.roleRequiresCommunity(role)).toBe(community);
  expect(permissions.roleAcceptsScope(role)).toBe(optional);
  expect(permissions.getRoleLabel(role)).toBe(label);
  expect(permissions.getRoleBadgeClass(role)).toBeTruthy();
});
