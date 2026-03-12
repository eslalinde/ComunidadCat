export const queryKeys = {
  // Entidades CRUD
  crud: {
    all: ['crud'] as const,
    table: (tableName: string) => ['crud', tableName] as const,
    list: (tableName: string, pageSize: number, params: unknown) =>
      ['crud', tableName, pageSize, params] as const,
  },

  // Detalle de comunidad
  community: {
    all: ['community'] as const,
    detail: (id: number) => ['community', 'detail', id] as const,
    brothers: (id: number) => ['community', 'brothers', id] as const,
    teams: (id: number) => ['community', 'teams', id] as const,
    teamMembers: (communityId: number) =>
      ['community', 'teamMembers', communityId] as const,
    teamParishes: (communityId: number) =>
      ['community', 'teamParishes', communityId] as const,
    stepLogs: (id: number) => ['community', 'stepLogs', id] as const,
    visits: (id: number) => ['community', 'visits', id] as const,
    inventory: (id: number) => ['community', 'inventory', id] as const,
    parishPriest: (parishId: number) =>
      ['community', 'parishPriest', parishId] as const,
  },

  // Detalle de parroquia
  parish: {
    all: ['parish'] as const,
    detail: (id: number) => ['parish', 'detail', id] as const,
    priests: (id: number) => ['parish', 'priests', id] as const,
    communities: (id: number) => ['parish', 'communities', id] as const,
  },

  // Opciones para selects/dropdowns
  options: {
    all: ['options'] as const,
    table: (tableName: string) => ['options', tableName] as const,
    filtered: (tableName: string, filters: Record<string, unknown>) =>
      ['options', tableName, filters] as const,
    catechistTeams: () => ['options', 'catechistTeams'] as const,
  },

  // Reportes
  reports: {
    all: ['report'] as const,
    type: (reportType: string) => ['report', reportType] as const,
  },

  // Audit
  audit: {
    all: ['audit'] as const,
    community: (communityId: number, filters?: Record<string, unknown>) =>
      ['audit', 'community', communityId, filters] as const,
  },

  // Admin
  admin: {
    all: ['admin'] as const,
    users: () => ['admin', 'users'] as const,
  },

  // User community access
  communityAccess: {
    all: ['communityAccess'] as const,
    community: (communityId: number) => ['communityAccess', 'community', communityId] as const,
    mine: () => ['communityAccess', 'mine'] as const,
  },
};
