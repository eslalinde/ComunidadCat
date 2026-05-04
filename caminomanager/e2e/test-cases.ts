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
  area: 'Sidebar' | 'Rutas' | 'Inicio' | 'Admin' | 'Parroquias' | 'Permisos' | 'Cuenta' | 'Comunidades';
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

  // ── Detalle de comunidad: visibilidad por rol ────────────────────────────
  {
    id: 'TC-COMMUNITY-DETAIL-ADMIN',
    area: 'Comunidades',
    role: 'admin',
    title: 'Detalle de comunidad — Administrador ve todos los controles',
    steps: [
      'Iniciar sesión como Administrador.',
      'Navegar a /comunidades/detalle?id=1.',
      'Inspeccionar el encabezado y las tarjetas principales.',
    ],
    expected:
      'Aparecen los botones Editar, Imprimir, Fusionar, Usuarios, Historial y Eliminar; las tarjetas de Bitácora (con botón Agregar), Hermanos (con Agregar Existente) y los equipos están visibles.',
  },
  {
    id: 'TC-COMMUNITY-DETAIL-CONTRIBUTOR',
    area: 'Comunidades',
    role: 'contributor',
    title: 'Detalle de comunidad — Contribuidor ve casi todo, sin Eliminar',
    steps: [
      'Iniciar sesión como Contribuidor.',
      'Navegar a /comunidades/detalle?id=1.',
    ],
    expected:
      'Ve Editar, Imprimir, Fusionar, Usuarios e Historial, además de Bitácora con Agregar y Agregar Existente en Hermanos. NO aparece el botón "Eliminar" (sólo admin/zone_leader pueden borrar la comunidad).',
  },
  {
    id: 'TC-COMMUNITY-DETAIL-ZONE_LEADER',
    area: 'Comunidades',
    role: 'zone_leader',
    title: 'Detalle de comunidad — Jefe de Zona tiene control completo en su zona',
    steps: [
      'Iniciar sesión como Jefe de Zona (zona Norte).',
      'Navegar a /comunidades/detalle?id=1 (parroquia 1, zona Norte).',
    ],
    expected:
      'Ve Editar, Imprimir, Fusionar, Usuarios, Historial y Eliminar, igual que el administrador, pero acotado a comunidades de su zona.',
  },
  {
    id: 'TC-COMMUNITY-DETAIL-ZONE_CONTRIBUTOR',
    area: 'Comunidades',
    role: 'zone_contributor',
    title: 'Detalle de comunidad — Contribuidor de Zona ve edición y bitácora, sin fusión ni accesos',
    steps: [
      'Iniciar sesión como Contribuidor Zona.',
      'Navegar a /comunidades/detalle?id=1.',
    ],
    expected:
      'Ve Editar, Imprimir, Historial y los botones de Bitácora y Hermanos. NO ve Fusionar, Usuarios ni Eliminar.',
  },
  {
    id: 'TC-COMMUNITY-DETAIL-COMMUNITY_RESPONSIBLE',
    area: 'Comunidades',
    role: 'community_responsible',
    title: 'Detalle de comunidad — Responsable de Comunidad sólo gestiona hermanos',
    steps: [
      'Iniciar sesión como Responsable de Comunidad (comunidad 1).',
      'Esperar la redirección automática al detalle.',
    ],
    expected:
      'NO ve Editar, Fusionar, Usuarios, Historial, Eliminar ni la tarjeta de Bitácora. SÍ ve Imprimir (lista de hermanos) y el botón "Agregar Existente" en la lista de hermanos.',
  },
  {
    id: 'TC-COMMUNITY-DETAIL-VIEWER_ZONE',
    area: 'Comunidades',
    role: 'viewer_zone',
    title: 'Detalle de comunidad — Viewer (zona) sólo lee',
    steps: [
      'Iniciar sesión como Viewer (zona Norte).',
      'Navegar a /comunidades/detalle?id=1.',
    ],
    expected:
      'Ve Imprimir y la Bitácora en modo lectura. NO aparecen Editar, Fusionar, Usuarios, Historial, Eliminar, ni botones de agregar (ni en Bitácora ni en Hermanos).',
  },
  {
    id: 'TC-COMMUNITY-DETAIL-VIEWER_COMMUNITY',
    area: 'Comunidades',
    role: 'viewer_community',
    title: 'Detalle de comunidad — Viewer (comunidad) sólo lee',
    steps: [
      'Iniciar sesión como Viewer (comunidad 1).',
      'Esperar la redirección automática al detalle.',
    ],
    expected:
      'Ve Imprimir y la Bitácora en modo lectura. No tiene controles de edición, fusión, accesos, historial, eliminación ni de gestión de hermanos.',
  },
  {
    id: 'TC-COMMUNITY-DETAIL-VIEWER_GRANTS',
    area: 'Comunidades',
    role: 'viewer_grants',
    title: 'Detalle de comunidad — Viewer (con grants) sólo lee',
    steps: [
      'Iniciar sesión como Viewer con grants sobre la comunidad 1.',
      'Navegar a /comunidades/detalle?id=1.',
    ],
    expected:
      'Comportamiento idéntico al viewer con scope de comunidad: lee la información y la bitácora; no ve ninguno de los controles de escritura.',
  },
  {
    id: 'TC-COMMUNITY-DETAIL-VIEWER_NOSCOPE-BLOCKED',
    area: 'Comunidades',
    role: 'viewer_noscope',
    title: 'Detalle de comunidad — Viewer sin alcance es redirigido',
    steps: [
      'Iniciar sesión como Viewer sin alcance.',
      'Intentar navegar manualmente a /comunidades/detalle?id=1.',
    ],
    expected:
      'El layout protegido detecta que el rol no puede acceder a /comunidades y redirige fuera de la ruta antes de renderizar el detalle.',
  },

  // ── Detalle de comunidad: acciones (writes) ──────────────────────────────
  {
    id: 'TC-COMMUNITY-DETAIL-ADMIN-EDIT',
    area: 'Comunidades',
    role: 'admin',
    title: 'Editar campo de la comunidad — round-trip',
    steps: [
      'Iniciar sesión como Administrador.',
      'Abrir el detalle de una comunidad scratch creada para la prueba.',
      'Pulsar "Editar", cambiar "Hermanos Actuales" a 7 y Guardar.',
      'Verificar el toast "Comunidad actualizada" y leer el valor desde la base.',
    ],
    expected:
      'El modal se cierra, aparece el toast de éxito y la columna actual_brothers en la tabla communities queda en 7. La prueba luego revierte el cambio.',
  },
  {
    id: 'TC-COMMUNITY-DETAIL-ADMIN-CREATE-TEAM',
    area: 'Comunidades',
    role: 'admin',
    title: 'Crear y eliminar Equipo de Responsables desde el detalle',
    steps: [
      'Iniciar sesión como Administrador.',
      'Abrir el detalle de la comunidad scratch (sin equipos).',
      'Pulsar "Crear Equipo de Responsables".',
      'Verificar el TeamSection y luego pulsar "Eliminar Equipo" y confirmar.',
    ],
    expected:
      'Se inserta una fila en teams (team_type_id=4), aparece el card "Equipo de Responsables", el borrado desde la UI ejecuta el cleanup en cascada y el equipo desaparece de la base.',
  },
  {
    id: 'TC-COMMUNITY-DETAIL-ADMIN-STEPLOG',
    area: 'Comunidades',
    role: 'admin',
    title: 'Agregar entrada a la bitácora',
    steps: [
      'Iniciar sesión como Administrador.',
      'Abrir el detalle de la comunidad scratch.',
      'Pulsar "Agregar" en la tarjeta Bitácora, escribir una nota y Guardar.',
    ],
    expected:
      'La nota aparece en la lista compacta de la bitácora y existe una fila en community_step_log con esa nota para la comunidad scratch.',
  },
  {
    id: 'TC-COMMUNITY-DETAIL-CONTRIBUTOR-CATEQUISTAS',
    area: 'Comunidades',
    role: 'contributor',
    title: 'Contribuidor crea Equipo de Catequistas y NO puede eliminar la comunidad',
    steps: [
      'Iniciar sesión como Contribuidor.',
      'Abrir el detalle de la comunidad scratch (sin equipos de catequistas).',
      'Confirmar que el botón "Eliminar" del encabezado no aparece.',
      'Pulsar "Crear Equipo de Catequistas".',
    ],
    expected:
      'El botón "Eliminar" de la comunidad nunca aparece para el contribuidor. Tras pulsar "Crear", se inserta una fila en teams (team_type_id=3) y aparece el card "Equipo de Catequistas".',
  },
];

export const TEST_CASES: TestCase[] = [...generated, ...handwritten];

export const TEST_CASES_BY_ID: Record<string, TestCase> = Object.fromEntries(
  TEST_CASES.map((tc) => [tc.id, tc])
);

export function getTestCase(id: string): TestCase | undefined {
  return TEST_CASES_BY_ID[id];
}
