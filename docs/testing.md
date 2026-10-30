# Pruebas de ComunidadCat

## Objetivo y estado

Proteger reglas de negocio y permisos con pruebas rápidas, comprobar contratos
reales de PostgreSQL y mantener una regresión de los recorridos principales en
navegador y escritorio. La cantidad de pruebas y la cobertura son señales
complementarias: una aserción debe fallar si se rompe el comportamiento que protege.

Medición local del 30 de octubre de 2026:

- Vitest: **723 pruebas aprobadas, 46 archivos**, con las dependencias y los
  cambios de `main` incorporados al preparar el PR.
- Base de datos: **35 aserciones pgTAP aprobadas** sobre PostgreSQL local, con RLS activa.
- Smoke Playwright: **18 pruebas aprobadas** en esta revisión,
  nueve en escritorio y nueve en móvil,
  sobre el export estático recién compilado. Sin reintentos ni omisiones.
- Cobertura de aplicación: **88,11 % líneas (3486/3956), 86,93 % sentencias
  (3825/4400), 81,09 % ramas (3144/3877), 85,43 % funciones (1009/1181)**.
  El punto de partida con el mismo alcance de inclusión era 31,43 % de líneas.
- TypeScript aprobado; ESLint sin errores, con advertencias existentes.
- Build de producción con Webpack aprobado para el smoke de esta revisión. Rollback verificado: cero usuarios y
  comunidades temporales de integración persistentes.
- Los jobs nuevos de GitHub Actions requieren su primera ejecución remota.
- La regresión web completa y Electron están definidos, pero no se volvieron a
  ejecutar en esta ampliación. El resultado previo de la regresión está en
  `docs/testing-review.md` y no sustituye una ejecución sobre este estado.

La cobertura incluye páginas, componentes propios, contextos, hooks, lógica e
infraestructura de `src`. Excluye pruebas, declaraciones de tipos, barrels
`index.ts` y componentes base de `src/components/ui`. No mide Electron ni SQL.
La medición anterior (27,63 % de líneas) excluía componentes, páginas, contextos e
infraestructura; **los dos porcentajes no tienen el mismo denominador**.

## Cobertura de módulos críticos

| Módulo | Líneas medidas | Ramas medidas | Mínimo de líneas en CI |
| --- | ---: | ---: | ---: |
| Permisos y navegación por rol | 100 % | 98,07 % | 100 % |
| Carismas | 100 % | 100 % | 100 % |
| Validación de formularios | 95,94 % | 95,16 % | 95 % |
| Errores de Supabase | 100 % | 96,22 % | 100 % |
| Parser CSV | 90,29 % | 94,20 % | 90 % |
| Servicio de carga masiva | 100 % | 92,30 % | 90 % |
| Mensajes de auditoría | 91,89 % | 92,74 % | 90 % |
| CRUD y caché optimista | 82,24 % | 66,27 % | 80 % |
| Accesos adicionales de comunidad | 100 % | 94,11 % | 100 % |
| Datos de comunidad y matrimonios | 98,98 % | 94,23 % | 95 % |
| Datos de parroquia | 100 % | 100 % | 100 % |
| Reporte de equipos catequistas | 100 % | 97,05 % | 100 % |
| Reportes de presbíteros y catequesis | 100 % | 100 % | 100 % |

También alcanzan 100 % de líneas AuthContext, administración de usuarios,
feature flags, auditoría, opciones dependientes, equipo nacional y reporte de
líderes. El inventario tiene 100 % de líneas y 94,64 % de ramas; equipos,
93,02 % y 78,80 %, respectivamente. Los casos pendientes siguen incluidos en
el denominador global.

Los mínimos globales son **80 % para líneas, sentencias, ramas y funciones**.
Se mantienen las mismas inclusiones y exclusiones del punto de partida de
31,43 % de líneas: el aumento proviene de ejecutar y verificar más comportamientos.
Los umbrales por archivo también se verifican y no permiten que un módulo fuerte
oculte la pérdida de cobertura de otro. La configuración exacta está en
`caminomanager/vitest.config.ts`.

## Comandos

Requiere Node.js 22.12 o superior. Instalar dependencias con
`npm ci --prefix caminomanager`. Desde la raíz:

```powershell
npm test
npm run test:coverage
npm run test:integration
npm run test:e2e:smoke
npm run test:e2e:regression
```

Desde `caminomanager`:

```powershell
npm run test:watch
npm run type-check
npm run lint
npm run test:e2e:ui
npm run test:e2e:report
npm run test:electron
```

Cobertura HTML: `caminomanager/coverage/index.html`. También se generan LCOV y
`coverage-summary.json`. CI conserva el reporte como artefacto `vitest-coverage`.

## Niveles de prueba

### 1. Unitarias y componentes

Vitest ejecuta `src/**/*.test.{ts,tsx}`. Las pruebas de funciones y hooks usan
React Query y PapaParse reales, con transporte Supabase simulado. Las pruebas de
pantallas combinan formularios reales con pruebas de contratos entre componentes:
en estas últimas se sustituyen colaboradores ya probados, como el formulario
genérico o el hook de datos. Se verifican resultados visibles, errores, payloads,
aislamiento de caché e invalidación. Las pruebas de reportes mantienen TanStack
Table real y verifican el contenido de los archivos CSV generados.

La ampliación incluye:

- Sesión, redirecciones, login, registro, confirmación de correo y perfil.
- Administración, roles y alcances, concesión y revocación de accesos.
- Personas, matrimonios, equipos, responsables y sacerdotes.
- Inventario, visitas, bitácora, catequesis y fusión de comunidades.
- Auditoría, opciones dependientes, indicadores y reportes con exportación.
- Fichas imprimibles y contratos del puente IPC y service worker.

Los contratos del puente Electron simulan `window.electronAPI`; no sustituyen
la automatización del instalador ni una ejecución real de Electron. Los casos
de formularios tienen un límite de 15 segundos para soportar la instrumentación
de cobertura en Windows/CI, sin reintentos automáticos.

Los casos de rollback retienen la recarga para que una nueva respuesta del
servidor no oculte una reversión defectuosa. La carga masiva comprueba éxito,
fallos parciales, lotes, matrimonios, responsables y total de hermanos. Una
regresión detectada aquí se corrigió: el total se obtiene de `count` en consultas
`head: true` y conserva los hermanos existentes, en vez de usar `data` o solo las
filas recién importadas.

### 2. Integración con PostgreSQL real

Requiere Docker y Supabase local con las migraciones aplicadas. La suite crea su
propio grafo de ciudad, zonas, parroquias, comunidades y nueve perfiles; no depende
de IDs del seed ni de usuarios E2E. Cada archivo comienza con `BEGIN` y termina con
`ROLLBACK`. Las aserciones se ejecutan como `authenticated`, sin bypass de RLS.

Comprueba:

- RLS habilitada en las tablas críticas.
- Visibilidad exacta de dos comunidades para cada uno de los nueve alcances.
- Edición autorizada y rechazo de edición fuera del alcance o en modo lectura.
- Rechazo de concesiones hechas por un viewer.
- Concesión idempotente, lectura mediante el RPC de cuenta y revocación inmediata.

`scripts/test-database.mjs` ejecuta pgTAP y falla ante SQL inválido, aserciones
`not ok`, plan incompleto o ausencia de archivos. Siempre intenta rollback y
cierra la conexión. Solo acepta hosts loopback mediante `TEST_DATABASE_URL`;
ignora `DATABASE_URL` para no reutilizar credenciales de otro entorno. El valor
por defecto es la conexión local estándar de Supabase, puerto 54322.

El runner evita depender de los montajes Docker de `supabase test db`, que en
este equipo Windows fallaron con rutas de la unidad F:. Los workflows fijan
**2.122.0**, validado con la configuración del repositorio. Para iniciar un
entorno local compatible:

```powershell
npx --yes supabase@2.122.0 start
npm run test:integration
```

No se necesita resetear la base para ejecutar los contratos. Si se valida una
migración desde cero, usar `supabase db reset --local` únicamente en una base de
pruebas desechable: ese comando sí elimina sus datos.

### 3. Automatización web y Electron

Playwright compila el export estático con `build:e2e` y lo sirve en
`http://127.0.0.1:3100`. El servidor escucha solo en loopback, rechaza métodos de
escritura y no reutiliza un servidor de desarrollo existente. Esto evita
confundir otro checkout o fallos de recarga de Next con el producto distribuido.
Para depurar sobre un export que se acaba de compilar se puede establecer
`PLAYWRIGHT_SKIP_BUILD=1`; no usarlo para validar cambios de código ni en CI.

Instalar el navegador una vez desde `caminomanager`:

```powershell
npx playwright install chromium
```

El smoke no requiere usuarios ni Supabase activo; sí requiere las variables
públicas de Supabase durante la compilación. El rechazo de credenciales usa una
respuesta HTTP simulada y **no demuestra autenticación real**.

La regresión requiere Supabase local, el grafo de `supabase/seed.sql`, y
`npm run seed:e2e --prefix caminomanager`. Configurar
`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` con los
valores del entorno local **antes de compilar**. No apuntar los specs de escritura
a producción. El workflow manual crea un backend desechable, obtiene sus
credenciales locales y prepara los usuarios automáticamente.

| Prioridad | Suite / ubicación | Comportamiento que protege | Ejecución |
| --- | --- | --- | --- |
| P0 | `e2e/auth`, `e2e/ui-lab` | Validación de login, errores, redirecciones sin sesión, teclado, diálogos, filtros y paginación | Cada PR; escritorio y móvil |
| P0 | `e2e/roles` | Menú, cuenta, administración, rutas y acciones según rol y alcance | Regresión manual antes de publicar |
| P0 | `e2e/ui/cities-reui.spec.ts` y formularios | CRUD persistente, validación y selección de relaciones | Regresión manual |
| P0 | `e2e/roles/community-detail-actions.spec.ts` | Cambios de comunidad y equipos con comprobación de persistencia | Regresión manual; datos temporales locales |
| P1 | `e2e/ui/bulk-upload-stepper.spec.ts` | Validación y navegación de la carga CSV | Regresión manual |
| P1 | `e2e/reports` | Carga, filtrado, columnas y contratos RPC de reportes | Regresión manual |
| P1 | `e2e/ui/responsive-navigation.spec.ts` | Navegación escritorio/móvil | Regresión manual |
| P0 de escritorio | `e2e/electron/renderer-smoke.spec.ts` | Export, bridge, login, controles de ventana y formularios | Windows antes de publicar instalador |

`test:electron` ahora compila el frontend antes del proceso principal para evitar
probar un export antiguo. Electron no se ejecuta en el workflow web.

CI conserva capturas y trazas de fallos. La suite web usa un worker, cero
reintentos y rechaza `test.only`. Vitest también rechaza `.only` en CI.
El workflow **Web Regression** se ejecuta bajo demanda; no se ha programado una
ejecución nocturna. La galería de capturas permanece fuera de la suite: no es una
prueba de regresión visual.

## Siguientes objetivos medibles

1. Mantener al menos 80 % global en las cuatro métricas y elevar las ramas de
   detalle de comunidad, carga masiva y formularios dinámicos. La cobertura no
   demuestra por sí sola atomicidad ni persistencia real en Supabase.
2. Completar búsquedas por relaciones en `useCrud` y elevar sus ramas a 85 %.
3. Ampliar contratos SQL a INSERT/DELETE, restricciones de relaciones,
   matrimonios, fusión de comunidades y bitácora. Añadir pruebas por API con
   sesiones reales para cubrir también Auth/PostgREST; pgTAP no cubre esa frontera.
4. Endurecer la suite de rutas existente: cubrir los nueve alcances y comprobar
   contenido/destino exacto y sesión vigente. Actualmente solo ejecuta cinco
   variantes y una redirección genérica puede dar falsos positivos.
5. Añadir carga CSV completa con persistencia, cierre/restauración de sesión,
   impresión, exportación CSV y actualización de Electron. Las pruebas actuales
   del Stepper no equivalen a una importación de extremo a extremo.
6. Resolver las 13 omisiones móviles existentes en detalle de comunidad o
   documentarlas individualmente como casos exclusivos de escritorio. Estabilizar
   fixtures antes de paralelizar o añadir navegadores.

Todo bug corregido debe tener una prueba de regresión en la capa más baja que
pueda detectarlo. No bajar mínimos, excluir fuentes de negocio ni añadir
reintentos para conseguir un resultado verde.

Referencias de configuración: [cobertura de Vitest](https://vitest.dev/config/coverage),
[pruebas de base de datos Supabase](https://supabase.com/docs/guides/local-development/testing/overview)
y [anotaciones de Playwright](https://playwright.dev/docs/test-annotations).
