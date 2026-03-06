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
  // community_responsible cannot see audit log (except their own events, handled by RLS)
  return scope.role !== 'community_responsible' && scope.role !== 'viewer';
}

export function canViewStepLog(scope: UserScope | null): boolean {
  if (!scope) return false;
  return scope.role !== 'community_responsible';
}

export function canPrintFicha(scope: UserScope | null): boolean {
  if (!scope) return false;
  return scope.role !== 'community_responsible';
}

export function canPrintHermanos(scope: UserScope | null): boolean {
  if (!scope) return false;
  return true; // all roles can print brothers list
}

export function canPrintTodo(scope: UserScope | null): boolean {
  if (!scope) return false;
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

  if (role === 'viewer') {
    return {
      principal: true,
      comunidades: true,
      parroquias: true,
      personas: true,
      organizacion: true,
      ubicaciones: true,
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
