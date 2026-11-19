export const routes = {
  login: '/login',
  signup: '/signup',
  home: '/',
  paises: '/paises',
  departamentos: '/departamentos',
  ciudades: '/ciudades',
  zonas: '/zonas',
  diocesis: '/diocesis',
  parroquias: '/parroquias',
  parroquia: (id: string | number) => `/parroquias/detalle?id=${id}`,
  etapas: '/etapas',
  tiposEquipo: '/tipos-equipo',
  tiposInventario: '/tipos-inventario',
  personas: '/personas',
  comunidades: '/comunidades',
  comunidad: (id: string | number) => `/comunidades/detalle?id=${id}`,
  equipoNacional: '/equipo-nacional',
  reportes: '/reportes',
  reporteCatequistas: '/reportes/equipos-catequistas',
  reportePresbiteros: '/reportes/presbiteros',
  reporteEstadoPasos: '/reportes/estado-pasos',
  reporteLideres: '/reportes/lideres-comunidades',
  reporteCatequesisParroquia: '/reportes/catequesis-parroquia',
  cuenta: '/cuenta',
  admin: '/admin',
  publico: '/publico',
  authConfirm: '/auth/confirm',
  uiLab: '/ui-lab',
} as const;

export const publicRoutes = [
  routes.login, routes.signup, routes.publico,
  routes.authConfirm,
  routes.uiLab,
];

/**
 * Returns `target` only when it is a same-origin, app-relative path.
 * Prevents open redirects through `?redirectTo=https://evil.example`,
 * protocol-relative URLs (`//evil.example`) or backslash tricks (`/\evil`).
 */
export function getSafeRedirectPath(target: string | null | undefined, fallback: string = routes.home): string {
  if (!target || !target.startsWith('/') || target.startsWith('//') || target.includes('\\')) {
    return fallback;
  }
  // URL parsers strip control characters (tabs, new lines), which can hide a scheme.
  if (/[\u0000-\u001F\u007F]/.test(target)) return fallback;
  try {
    const base = 'https://app.invalid';
    const url = new URL(target, base);
    if (url.origin !== base) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
