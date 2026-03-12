export type AppRole =
  | 'admin'
  | 'contributor'
  | 'zone_leader'
  | 'zone_contributor'
  | 'community_responsible'
  | 'viewer';

export interface UserScope {
  role: AppRole;
  person_id: number | null;
  zone_id: number | null;
  community_id: number | null;
  has_community_grants: boolean;
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  contributor: 'Contribuidor',
  zone_leader: 'Jefe de Zona',
  zone_contributor: 'Contribuidor Zona',
  community_responsible: 'Responsable de Comunidad',
  viewer: 'Visualizador',
};

const ROLE_BADGE_CLASSES: Record<AppRole, string> = {
  admin: 'bg-blue-100 text-[#1B3A6F] border-blue-300',
  contributor: 'bg-blue-100 text-blue-700 border-blue-300',
  zone_leader: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  zone_contributor: 'bg-teal-100 text-teal-700 border-teal-300',
  community_responsible: 'bg-purple-100 text-purple-700 border-purple-300',
  viewer: 'bg-gray-100 text-gray-700 border-gray-300',
};

export function getRoleLabel(role: AppRole): string {
  return ROLE_LABELS[role] ?? role;
}

export function getRoleBadgeClass(role: AppRole): string {
  return ROLE_BADGE_CLASSES[role] ?? ROLE_BADGE_CLASSES.viewer;
}

// Does this role need a zone_id?
export function roleRequiresZone(role: AppRole): boolean {
  return role === 'zone_leader' || role === 'zone_contributor';
}

// Does this role need a community_id?
export function roleRequiresCommunity(role: AppRole): boolean {
  return role === 'community_responsible';
}

// Does this role optionally accept scope (zone or community)?
export function roleAcceptsScope(role: AppRole): boolean {
  return role === 'viewer';
}

// Helper: does the viewer have any scope assigned (profile or grants)?
function viewerHasScope(scope: UserScope): boolean {
  return scope.role === 'viewer' && (scope.zone_id !== null || scope.community_id !== null || scope.has_community_grants);
}

// Helper: is viewer scoped to a single community (not a zone)?
function viewerIsCommunityScoped(scope: UserScope): boolean {
  return scope.role === 'viewer' && scope.community_id !== null && scope.zone_id === null;
}

// --- Permission checks ---

export function canAccessAdmin(scope: UserScope | null): boolean {
  return scope?.role === 'admin';
}

export function canEditCommunity(scope: UserScope | null): boolean {
  if (!scope) return false;
  return ['admin', 'contributor', 'zone_leader', 'zone_contributor'].includes(scope.role);
}

export function canDeleteCommunity(scope: UserScope | null): boolean {
  if (!scope) return false;
  return ['admin', 'zone_leader'].includes(scope.role);
}

export function canMergeCommunity(scope: UserScope | null): boolean {
  if (!scope) return false;
  return ['admin', 'contributor', 'zone_leader'].includes(scope.role);
}

export function canManageBrothers(scope: UserScope | null): boolean {
  if (!scope) return false;
  return ['admin', 'contributor', 'zone_leader', 'zone_contributor', 'community_responsible'].includes(scope.role);
}

export function canManageTeams(scope: UserScope | null): boolean {
  if (!scope) return false;
  return ['admin', 'contributor', 'zone_leader'].includes(scope.role);
}

export function canViewAuditLog(scope: UserScope | null): boolean {
  if (!scope) return false;
  return ['admin', 'contributor', 'zone_leader', 'zone_contributor'].includes(scope.role);
}

export function canViewStepLog(scope: UserScope | null): boolean {
  if (!scope) return false;
  // viewer with scope can see step logs; community_responsible cannot
  if (scope.role === 'viewer') return viewerHasScope(scope);
  return scope.role !== 'community_responsible';
}

export function canEditStepLog(scope: UserScope | null): boolean {
  if (!scope) return false;
  return ['admin', 'contributor', 'zone_leader', 'zone_contributor'].includes(scope.role);
}

export function canPrintFicha(scope: UserScope | null): boolean {
  if (!scope) return false;
  if (scope.role === 'viewer') return viewerHasScope(scope);
  return scope.role !== 'community_responsible';
}

export function canPrintHermanos(scope: UserScope | null): boolean {
  if (!scope) return false;
  if (scope.role === 'viewer') return viewerHasScope(scope);
  return true;
}

export function canPrintTodo(scope: UserScope | null): boolean {
  if (!scope) return false;
  if (scope.role === 'viewer') return viewerHasScope(scope);
  return scope.role !== 'community_responsible';
}

export function canManageParishes(scope: UserScope | null): boolean {
  if (!scope) return false;
  return ['admin', 'contributor', 'zone_leader'].includes(scope.role);
}

export function canManagePriests(scope: UserScope | null): boolean {
  if (!scope) return false;
  return ['admin', 'contributor', 'zone_leader'].includes(scope.role);
}

export function canWriteMasterData(scope: UserScope | null): boolean {
  if (!scope) return false;
  return ['admin', 'contributor'].includes(scope.role);
}

export function canManageCommunityAccess(scope: UserScope | null): boolean {
  if (!scope) return false;
  return ['admin', 'contributor', 'zone_leader'].includes(scope.role);
}

// --- Route access checks ---

// Returns true if the user can access a given pathname.
// Used by the protected layout to block direct URL navigation.
export function canAccessRoute(scope: UserScope | null, pathname: string): boolean {
  if (!scope) return false;

  const vis = getSidebarVisibility(scope);

  // /cuenta is always accessible to authenticated users
  if (pathname === '/cuenta') return true;

  // Admin panel
  if (pathname.startsWith('/admin')) return vis.admin;

  // Reports
  if (pathname.startsWith('/reportes')) return vis.reportes;

  // Organization routes
  if (
    pathname.startsWith('/diocesis') ||
    pathname.startsWith('/equipo-nacional') ||
    pathname.startsWith('/etapas') ||
    pathname.startsWith('/tipos-equipo') ||
    pathname.startsWith('/tipos-inventario')
  ) return vis.organizacion;

  // Location routes
  if (
    pathname.startsWith('/paises') ||
    pathname.startsWith('/departamentos') ||
    pathname.startsWith('/ciudades') ||
    pathname.startsWith('/zonas')
  ) return vis.ubicaciones;

  // Personas
  if (pathname.startsWith('/personas')) return vis.personas;

  // Parroquias
  if (pathname.startsWith('/parroquias')) return vis.parroquias;

  // Comunidades
  if (pathname.startsWith('/comunidades')) return vis.comunidades;

  // Home page: always accessible
  if (pathname === '/') return true;

  // Unknown route: allow (don't block 404 pages)
  return true;
}

// Sidebar visibility
export interface SidebarVisibility {
  principal: boolean;      // Inicio, Comunidades, Parroquias, Personas
  comunidades: boolean;
  parroquias: boolean;
  personas: boolean;
  organizacion: boolean;   // Diocesis, Equipo Nacional, Etapas, Tipos
  ubicaciones: boolean;    // Paises, Departamentos, Ciudades, Zonas
  reportes: boolean;
  admin: boolean;
}

export function getSidebarVisibility(scope: UserScope | null): SidebarVisibility {
  if (!scope) {
    return {
      principal: false, comunidades: false, parroquias: false, personas: false,
      organizacion: false, ubicaciones: false, reportes: false, admin: false,
    };
  }

  const { role } = scope;

  // Viewer without scope: sees nothing (new user waiting for admin assignment)
  if (role === 'viewer' && !viewerHasScope(scope)) {
    return {
      principal: true,
      comunidades: false,
      parroquias: false,
      personas: false,
      organizacion: false,
      ubicaciones: false,
      reportes: false,
      admin: false,
    };
  }

  // Viewer with only community grants (no profile-level scope): can see communities
  if (role === 'viewer' && scope.zone_id === null && scope.community_id === null && scope.has_community_grants) {
    return {
      principal: true,
      comunidades: true,
      parroquias: false,
      personas: false,
      organizacion: false,
      ubicaciones: false,
      reportes: false,
      admin: false,
    };
  }

  // Viewer with community scope: like community_responsible but read-only
  if (role === 'viewer' && viewerIsCommunityScoped(scope)) {
    return {
      principal: true,
      comunidades: true,
      parroquias: false,
      personas: false,
      organizacion: false,
      ubicaciones: false,
      reportes: false,
      admin: false,
    };
  }

  // Viewer with zone scope: can see communities and parroquias in their zone
  if (role === 'viewer') {
    return {
      principal: true,
      comunidades: true,
      parroquias: true,
      personas: false,
      organizacion: false,
      ubicaciones: false,
      reportes: false,
      admin: false,
    };
  }

  if (role === 'community_responsible') {
    return {
      principal: true,
      comunidades: true,
      parroquias: false,
      personas: false,
      organizacion: false,
      ubicaciones: false,
      reportes: false,
      admin: false,
    };
  }

  if (role === 'zone_contributor') {
    return {
      principal: true,
      comunidades: true,
      parroquias: true,
      personas: true,
      organizacion: false,
      ubicaciones: false,
      reportes: false,
      admin: false,
    };
  }

  if (role === 'zone_leader') {
    return {
      principal: true,
      comunidades: true,
      parroquias: true,
      personas: true,
      organizacion: false,
      ubicaciones: false,
      reportes: true,
      admin: false,
    };
  }

  // admin and contributor: full access
  return {
    principal: true,
    comunidades: true,
    parroquias: true,
    personas: true,
    organizacion: true,
    ubicaciones: true,
    reportes: true,
    admin: role === 'admin',
  };
}
