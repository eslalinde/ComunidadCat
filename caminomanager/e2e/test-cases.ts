// Catalog of E2E test cases. Each automated spec attaches a testCaseId to its
// screenshots (see takeRoleScreenshot's options.testCaseId), and the report
// generator joins by id to render the steps + expected outcome next to every
// captured screen.
//
// To add a new case: append an entry below with a stable id and reference that
// id from the corresponding test. Keep `steps` short and imperative; keep
// `expected` as a single sentence describing the verifiable outcome.

export interface TestCase {
  id: string;
  area: 'Sidebar' | 'Rutas' | 'Inicio' | 'Admin' | 'Parroquias' | 'Permisos' | 'Cuenta';
  role: string;
  title: string;
  steps: string[];
  expected: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  contributor: 'Contribuidor',
  zone_leader: 'Jefe de Zona',
  zone_contributor: 'Contribuidor Zona',
  community_responsible: 'Responsable de Comunidad',
  viewer_zone: 'Viewer (zona)',
  viewer_community: 'Viewer (comunidad)',
  viewer_grants: 'Viewer (con grants)',
  viewer_noscope: 'Viewer (sin alcance)',
};

const SIDEBAR_EXPECTED: Record<string, string> = {
  admin: 'Inicio, Comunidades, Parroquias, Personas, Reportes y Administración',
  contributor: 'Inicio, Comunidades, Parroquias, Personas y Reportes; sin Administración',
  zone_leader: 'Inicio, Comunidades, Parroquias, Personas y Reportes; sin Administración',
  zone_contributor: 'Inicio, Comunidades, Parroquias y Personas; sin Reportes ni Administración',
  community_responsible: 'Inicio y Comunidades únicamente',
  viewer_zone: 'Inicio, Comunidades y Parroquias',
  viewer_community: 'Inicio y Comunidades únicamente',
  viewer_grants: 'Inicio y Comunidades únicamente',
  viewer_noscope: 'Inicio únicamente; el resto del menú está oculto hasta que un admin asigne alcance',
};

const HOME_EXPECTED: Record<string, string> = {
  admin: 'Tarjetas: Comunidades, Parroquias, Personas, Reportes; con sección "Otras secciones".',
  contributor: 'Tarjetas: Comunidades, Parroquias, Personas, Reportes; con sección "Otras secciones".',
  zone_leader: 'Tarjetas: Comunidades, Parroquias, Personas, Reportes; sin "Otras secciones".',
  zone_contributor: 'Tarjetas: Comunidades, Parroquias, Personas; sin Reportes ni "Otras secciones".',
  viewer_zone: 'Tarjetas: Comunidades y Parroquias.',
  viewer_grants: 'Tarjeta: Comunidades.',
  viewer_noscope: 'Sin tarjetas visibles; mensaje de bienvenida sin atajos.',
};

const ROUTE_LABELS: Record<string, string> = {
  comunidades: '/comunidades',
  parroquias: '/parroquias',
  personas: '/personas',
  reportes: '/reportes',
  diocesis: '/diocesis',
  admin: '/admin',
  cuenta: '/cuenta',
};

function tcSidebar(role: string): TestCase {
  return {
    id: `TC-SIDEBAR-${role.toUpperCase()}`,
    area: 'Sidebar',
    role,
    title: `Sidebar — ${ROLE_LABELS[role] ?? role}`,
    steps: [
      `Iniciar sesión con un usuario de rol "${ROLE_LABELS[role] ?? role}".`,
      'Esperar a que cargue la pantalla principal.',
      'Observar los items del menú lateral.',
    ],
    expected: `El sidebar muestra exactamente: ${SIDEBAR_EXPECTED[role] ?? '—'}.`,
  };
}

function tcHome(role: string): TestCase {
  return {
    id: `TC-HOME-${role.toUpperCase()}`,
    area: 'Inicio',
    role,
    title: `Pantalla de inicio — ${ROLE_LABELS[role] ?? role}`,
    steps: [
      `Iniciar sesión con un usuario de rol "${ROLE_LABELS[role] ?? role}".`,
      'Permanecer en la ruta "/".',
    ],
    expected: HOME_EXPECTED[role] ?? '—',
  };
}

function tcHomeRedirect(role: string): TestCase {
  return {
    id: `TC-HOME-${role.toUpperCase()}`,
    area: 'Inicio',
    role,
    title: `Inicio redirige — ${ROLE_LABELS[role] ?? role}`,
    steps: [
      `Iniciar sesión con un usuario de rol "${ROLE_LABELS[role] ?? role}".`,
      'Esperar la redirección automática.',
    ],
    expected: 'El usuario es enviado al detalle de su comunidad asignada (/comunidades/detalle/...).',
  };
}

function tcRoute(role: string, routeKey: string, canAccess: boolean): TestCase {
  const path = ROUTE_LABELS[routeKey] ?? `/${routeKey}`;
  const verb = canAccess ? 'puede' : 'NO puede';
  return {
    id: `TC-ROUTE-${role.toUpperCase()}-${routeKey.toUpperCase()}-${canAccess ? 'OK' : 'BLOCK'}`,
    area: 'Rutas',
    role,
    title: `${ROLE_LABELS[role] ?? role} ${verb} entrar a ${path}`,
    steps: [
      `Iniciar sesión con un usuario de rol "${ROLE_LABELS[role] ?? role}".`,
      `Navegar manualmente a ${path}.`,
    ],
    expected: canAccess
      ? `La URL queda en ${path} y la página carga normalmente.`
      : `La aplicación redirige fuera de ${path} (no se permite acceso directo por URL).`,
  };
}

const ROLES_WITH_SIDEBAR = [
  'admin',
  'contributor',
  'zone_leader',
  'zone_contributor',
  'community_responsible',
  'viewer_zone',
  'viewer_community',
  'viewer_grants',
  'viewer_noscope',
];

const HOME_ROLES = [
  'admin',
  'contributor',
  'zone_leader',
  'zone_contributor',
  'viewer_zone',
  'viewer_grants',
  'viewer_noscope',
];

const HOME_REDIRECT_ROLES = ['community_responsible', 'viewer_community'];

const ROUTE_MATRIX: Record<string, Record<string, boolean>> = {
  admin: { comunidades: true, parroquias: true, personas: true, reportes: true, diocesis: true, admin: true, cuenta: true },
  zone_leader: { comunidades: true, parroquias: true, personas: true, reportes: true, diocesis: false, admin: false, cuenta: true },
  community_responsible: { comunidades: true, parroquias: false, personas: false, reportes: false, diocesis: false, admin: false, cuenta: true },
  viewer_grants: { comunidades: true, parroquias: false, personas: false, reportes: false, diocesis: false, admin: false, cuenta: true },
  viewer_noscope: { comunidades: false, parroquias: false, personas: false, reportes: false, diocesis: false, admin: false, cuenta: true },
};

const ROUTE_KEYS = ['comunidades', 'parroquias', 'personas', 'reportes', 'diocesis', 'admin', 'cuenta'];

const generated: TestCase[] = [];

for (const role of ROLES_WITH_SIDEBAR) generated.push(tcSidebar(role));
for (const role of HOME_ROLES) generated.push(tcHome(role));
for (const role of HOME_REDIRECT_ROLES) generated.push(tcHomeRedirect(role));
for (const role of Object.keys(ROUTE_MATRIX)) {
  for (const routeKey of ROUTE_KEYS) {
    generated.push(tcRoute(role, routeKey, ROUTE_MATRIX[role][routeKey]));
  }
}

const handwritten: TestCase[] = [
  {
    id: 'TC-ADMIN-PANEL-ADMIN',
    area: 'Admin',
    role: 'admin',
    title: 'Administrador entra al panel de administración',
    steps: [
      'Iniciar sesión como Administrador.',
      'Navegar a /admin.',
    ],
    expected: 'Se muestra "Administración de Usuarios" con la tabla de usuarios y el botón "Crear usuario".',
  },
  {
    id: 'TC-ADMIN-PANEL-CONTRIBUTOR-BLOCKED',
    area: 'Admin',
    role: 'contributor',
    title: 'Contribuidor NO puede acceder al panel admin',
    steps: [
      'Iniciar sesión como Contribuidor.',
      'Navegar manualmente a /admin.',
    ],
    expected: 'La aplicación redirige fuera de /admin: el contribuidor no puede entrar al panel.',
  },
  {
    id: 'TC-ADMIN-PANEL-VIEWER-BLOCKED',
    area: 'Admin',
    role: 'viewer_noscope',
    title: 'Viewer sin alcance NO puede acceder al panel admin',
    steps: [
      'Iniciar sesión como Viewer sin alcance.',
      'Navegar manualmente a /admin.',
    ],
    expected: 'La aplicación redirige fuera de /admin.',
  },
  // Parish zone visibility (the headline case)
  {
    id: 'TC-PARROQUIAS-ZONE-LEADER-SCOPED',
    area: 'Parroquias',
    role: 'zone_leader',
    title: 'Jefe de Zona solo ve parroquias de su zona',
    steps: [
      'Iniciar sesión como Jefe de Zona (asignado a la zona "Norte" — id 1, parroquias 1 a 10).',
      'Navegar a /parroquias.',
      'Esperar a que la tabla cargue.',
      'Revisar el contador de registros y los nombres listados.',
    ],
    expected:
      'El listado contiene 10 parroquias (todas de la zona Norte). No aparece ninguna parroquia de la zona Sur, por ejemplo "Parroquia San Juan Bosco" (id 11) está ausente.',
  },
  {
    id: 'TC-PARROQUIAS-ADMIN-FULL',
    area: 'Parroquias',
    role: 'admin',
    title: 'Administrador ve parroquias de todas las zonas',
    steps: [
      'Iniciar sesión como Administrador.',
      'Navegar a /parroquias.',
    ],
    expected: 'El listado muestra las 20 parroquias (zonas Norte y Sur). Aparecen tanto "Parroquia La Visitación" (Norte) como "Parroquia San Juan Bosco" (Sur).',
  },
  // Permission management — the user's specific request to differentiate admin vs contributor
  {
    id: 'TC-PERMS-ADMIN-CAN-MANAGE',
    area: 'Permisos',
    role: 'admin',
    title: 'Administrador puede gestionar roles y permisos',
    steps: [
      'Iniciar sesión como Administrador.',
      'Navegar a /admin.',
      'Localizar la fila de cualquier usuario distinto al actual.',
    ],
    expected:
      'El admin ve el botón "Crear usuario" y un selector de rol editable junto a cada usuario (puede cambiar admin/contributor/zone_leader/etc. y disparar el diálogo de confirmación).',
  },
  // Account page — the displayed scope must name the actual zone/community,
  // not generic placeholders like "Comunidad asignada".
  {
    id: 'TC-CUENTA-ADMIN',
    area: 'Cuenta',
    role: 'admin',
    title: 'Cuenta — Administrador ve alcance global',
    steps: [
      'Iniciar sesión como Administrador.',
      'Navegar a /cuenta.',
    ],
    expected: 'La sección "Tu rol" muestra el badge "Administrador" y la línea "Alcance: Acceso global a todas las zonas y comunidades."',
  },
  {
    id: 'TC-CUENTA-CONTRIBUTOR',
    area: 'Cuenta',
    role: 'contributor',
    title: 'Cuenta — Contribuidor ve alcance global',
    steps: [
      'Iniciar sesión como Contribuidor.',
      'Navegar a /cuenta.',
    ],
    expected: 'Se muestra el badge "Contribuidor" y "Alcance: Acceso global a todas las zonas y comunidades."',
  },
  {
    id: 'TC-CUENTA-ZONE_LEADER',
    area: 'Cuenta',
    role: 'zone_leader',
    title: 'Cuenta — Jefe de Zona ve el nombre de su zona',
    steps: [
      'Iniciar sesión como Jefe de Zona (zona Norte).',
      'Navegar a /cuenta.',
    ],
    expected: 'La línea "Alcance" incluye el nombre real de la zona ("Zona Norte"), no el texto genérico "Zona asignada".',
  },
  {
    id: 'TC-CUENTA-ZONE_CONTRIBUTOR',
    area: 'Cuenta',
    role: 'zone_contributor',
    title: 'Cuenta — Contribuidor de Zona ve el nombre de su zona',
    steps: [
      'Iniciar sesión como Contribuidor Zona (zona Norte).',
      'Navegar a /cuenta.',
    ],
    expected: 'La línea "Alcance" muestra "Zona Norte".',
  },
  {
    id: 'TC-CUENTA-COMMUNITY_RESPONSIBLE',
    area: 'Cuenta',
    role: 'community_responsible',
    title: 'Cuenta — Responsable de Comunidad ve el número y la parroquia de su comunidad',
    steps: [
      'Iniciar sesión como Responsable de Comunidad (comunidad 1).',
      'Navegar a /cuenta.',
    ],
    expected: 'La línea "Alcance" identifica la comunidad concreta (por ejemplo "Comunidad 1 — Parroquia La Visitación"), no el texto genérico "Comunidad asignada".',
  },
  {
    id: 'TC-CUENTA-VIEWER_ZONE',
    area: 'Cuenta',
    role: 'viewer_zone',
    title: 'Cuenta — Viewer con zona ve el nombre de su zona',
    steps: [
      'Iniciar sesión como Viewer (zona Norte).',
      'Navegar a /cuenta.',
    ],
    expected: 'La línea "Alcance" muestra "Zona Norte".',
  },
  {
    id: 'TC-CUENTA-VIEWER_COMMUNITY',
    area: 'Cuenta',
    role: 'viewer_community',
    title: 'Cuenta — Viewer con comunidad ve el número y la parroquia de su comunidad',
    steps: [
      'Iniciar sesión como Viewer (comunidad 1).',
      'Navegar a /cuenta.',
    ],
    expected: 'La línea "Alcance" identifica la comunidad asignada (por ejemplo "Comunidad 1 — Parroquia La Visitación").',
  },
  {
    id: 'TC-CUENTA-VIEWER_GRANTS',
    area: 'Cuenta',
    role: 'viewer_grants',
    title: 'Cuenta — Viewer con grants ve la lista de comunidades otorgadas',
    steps: [
      'Iniciar sesión como Viewer (con grants pero sin zona/comunidad en el perfil).',
      'Navegar a /cuenta.',
    ],
    expected: 'Se muestra el panel verde "Comunidades con acceso otorgado" con un enlace a cada comunidad concedida.',
  },
  {
    id: 'TC-CUENTA-VIEWER_NOSCOPE',
    area: 'Cuenta',
    role: 'viewer_noscope',
    title: 'Cuenta — Viewer sin alcance recibe el mensaje correcto',
    steps: [
      'Iniciar sesión como Viewer sin alcance asignado.',
      'Navegar a /cuenta.',
    ],
    expected: 'Se muestra "Sin acceso asignado. Contacta a un administrador para que te otorgue permisos."',
  },
  {
    id: 'TC-PERMS-CONTRIBUTOR-CANNOT',
    area: 'Permisos',
    role: 'contributor',
    title: 'Contribuidor NO puede gestionar permisos',
    steps: [
      'Iniciar sesión como Contribuidor.',
      'Verificar que el item "Administración" no aparezca en el sidebar.',
      'Intentar entrar manualmente a /admin.',
    ],
    expected:
      'El contribuidor no ve "Administración" en el sidebar y al navegar a /admin la aplicación lo redirige fuera. No tiene forma de cambiar roles ni crear usuarios.',
  },
];

export const TEST_CASES: TestCase[] = [...generated, ...handwritten];

export const TEST_CASES_BY_ID: Record<string, TestCase> = Object.fromEntries(
  TEST_CASES.map((tc) => [tc.id, tc])
);

export function getTestCase(id: string): TestCase | undefined {
  return TEST_CASES_BY_ID[id];
}
