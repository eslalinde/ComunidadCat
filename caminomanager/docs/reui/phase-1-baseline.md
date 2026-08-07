# ReUI: fase 1 — línea base y criterios de entrada

Fotografía tomada el 31 de julio de 2026 sobre `main` en `cfa3a18`. Las
métricas estructurales se pueden recalcular con `npm run ui:audit`.

Esta fase convierte las hipótesis y el alcance de la
[fase 0 — descubrimiento](phase-0-discovery.md) en una línea base medible y una
decisión arquitectónica formal.

## Resultado de la fase

La fase 1 no cambia componentes en ejecución. Deja una decisión arquitectónica,
una línea base reproducible, un registro de procedencia y el contrato de pruebas
que debe cumplir cada incorporación.

## Línea base técnica

| Área | Estado inicial |
| --- | --- |
| Runtime declarado | Next.js ^16.2.1, React ^19.2.4, exportación estática |
| Estilos | Tailwind CSS 4, shadcn `new-york`, variables CSS |
| Primitivas | `radix-ui` 1.4.3 |
| Formularios | React Hook Form 7.72, Zod 4.3 |
| Tablas | TanStack Table 8.21 |
| Desktop | Electron 41; mismo renderer estático |
| Capa UI | 30 archivos TSX en `src/components/ui` |
| Uso de la fachada | 169 referencias desde 53 archivos; 28 módulos importados |
| HTML directo | 32 controles fuera de `components/ui` y de pruebas |
| Escape de la fachada | 1 consumidor directo de `radix-ui` fuera de UI |
| CSS global | 769 líneas; tokens de tema, correcciones de formulario y estilos de impresión |
| Unitarias | 9 archivos, 299 pruebas aprobadas |
| Playwright | 10 specs, 166 casos descubiertos; escritorio y Pixel 5 |

Los 30 archivos de UI se dividen en:

- 22 primitivas o composiciones shadcn: `avatar`, `badge`, `button`,
  `card`, `checkbox`, `collapsible`, `dialog`, `dropdown-menu`,
  `form`, `input`, `label`, `pagination`, `select`, `separator`,
  `sheet`, `sidebar`, `skeleton`, `sonner`, `switch`, `table`,
  `textarea` y `tooltip`;
- 7 composiciones del producto: `app-sidebar`, `brand-logo`, `breadcrumbs`,
  `carisma-badge`, `FeatureFlagsDialog`, `header` y `nav-user`;
- 1 artefacto de prueba manual: `select-test`.

## Hallazgos que condicionan la migración

1. `Button`, `Input`, `Dialog`, `Card`, `Select` y `Table` concentran
   la mayoría de los usos. Cambiar su API directamente tendría un radio de impacto
   innecesario.
2. Hay 32 usos de `button`, `input` o `select` nativos fuera de la capa UI.
   Algunos son intencionales —controles de ventana, carga de archivos y límites de
   error— y otros son deuda que se clasificará durante las fases funcionales.
3. `BrothersList.tsx` es el único consumidor de negocio que importa
   `radix-ui` directamente. No se corrige en esta fase para mantener el cambio
   libre de regresiones.
4. `globals.css` contiene tres correcciones globales con `!important` para
   popovers y formularios. El laboratorio debe comprobar si siguen siendo
   necesarias antes de añadir tokens o selectores ReUI.
5. La cobertura Playwright actual es sólida para roles y visibilidad, pero no
   cubre el comportamiento aislado de controles, teclado, foco ni temas.
6. CI ya ejecuta lint, type-check, cobertura unitaria y build. Playwright aún no se
   ejecuta en CI.
7. El `node_modules` local contiene Next.js 16.2.0, mientras `package.json` exige
   ^16.2.1 y el lock fija 16.2.1. El build local pasa, pero CI con `npm ci` es la
   fuente canónica para la versión bloqueada.

## Pilotos aprobados

### CRUD: Ciudades

`/ciudades` usa el CRUD genérico y tiene dos relaciones: País y Departamento.
Es suficientemente representativo para probar búsqueda, selector dependiente,
validación, creación, edición y confirmación destructiva, sin el riesgo funcional
de Personas o Comunidades.

Orden del piloto:

1. `Combobox` para País y Departamento.
2. `Field/Form` en el formulario genérico.
3. `AlertDialog` en la confirmación de borrado.

### Tabla: reporte aislado

Se construirá un laboratorio de `DataGrid` con datos de prueba y las columnas de
un reporte existente. No se conectará a Supabase ni reemplazará
`DynamicReportTable` hasta superar mediciones de accesibilidad, responsive y
bundle.

## Contrato Playwright para las fases siguientes

Las suites nuevas vivirán en `e2e/ui` y usarán nombres accesibles, no clases ni
atributos `data-radix-*`.

| Suite futura | Comportamientos mínimos |
| --- | --- |
| `combobox.spec.ts` | abrir con teclado, filtrar, elegir, limpiar, sin resultados, relación dependiente, foco al cerrar |
| `form.spec.ts` | etiquetas, requeridos, error asociado, primer error enfocado, envío bloqueado y estado cargando |
| `alert-dialog.spec.ts` | foco inicial seguro, cancelación, Escape, confirmación, estado pendiente y retorno de foco |
| `data-grid.spec.ts` | ordenar, filtrar, paginar, vacío, cargando, teclado, overflow móvil y persistencia de estado |

Cada suite se ejecutará en `chromium-desktop` y `chromium-mobile`. Las pruebas
visuales y de tema se añadirán sólo a estados estables para evitar snapshots
frágiles.

## Puerta de salida de fase 1

- [x] Línea base reproducible.
- [x] ADR de adopción selectiva aceptado.
- [x] Piloto CRUD y laboratorio de tabla identificados.
- [x] Registro de procedencia creado.
- [x] Contrato Playwright definido.
- [x] Lint sin errores, type-check y unitarias aprobados.
- [x] Build de exportación estática local verificado (30 rutas prerenderizadas).
- [x] Validación del renderer estático en Electron automatizada.

La puerta transversal quedó implementada al finalizar la hoja de ruta mediante
el [smoke test de Electron](electron-validation.md).
