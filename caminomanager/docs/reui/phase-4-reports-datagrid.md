# ReUI: fase 4 — piloto DataGrid en reportes

Fecha: 31 de julio de 2026.

## Resultado

El reporte de Equipos de Catequistas es el primer consumidor productivo de
`DataGrid`. La integración conserva `DynamicReportTable`, las definiciones de
columnas y la instancia de TanStack Table. No cambia las consultas de Supabase,
la exportación CSV ni las reglas de agrupación.

La activación es opt-in mediante `config.dataGrid`; los demás reportes continúan
con el render anterior hasta que el piloto demuestre estabilidad suficiente.

## Selección del piloto

Equipos de Catequistas se eligió porque ya tenía filtros, orden y agrupación,
pero no depende de pies con agregaciones. Esto permite validar el contrato de
tabla real sin mezclar el cambio visual con cálculos de totales o reglas de
dominio adicionales.

## Capacidades incorporadas

- render de encabezados, celdas normales, agrupadas y agregadas con
  `flexRender`;
- orden accesible mediante botones de encabezado y `aria-sort`;
- filtros globales y por columna existentes;
- paginación controlada, selector de filas por página y contador filtrado;
- selector de visibilidad para columnas;
- estados de carga y vacío dentro del DataGrid;
- ancho mínimo y overflow horizontal explícito en viewport móvil;
- compatibilidad con agrupación y expansión de filas.

## Diseño de integración

`DynamicReportConfig.dataGrid` funciona como feature flag local. Su presencia
activa `getPaginationRowModel`, el estado de visibilidad y el nuevo render. La
fachada pública sigue siendo `@/components/ui/data-grid`; las pantallas no
importan componentes upstream directamente.

La exportación continúa usando el modelo filtrado completo, no sólo la página
visible, preservando el comportamiento anterior.

## Pruebas

- `DynamicReportTableDataGrid.test.tsx`: paginación, orden accesible y
  visibilidad de columnas con datos sintéticos.
- `catechist-teams-datagrid.spec.ts`: reporte real con orden por teclado,
  filtro por columna, paginación, visibilidad y overflow responsive en desktop
  y mobile.
- Las suites existentes del laboratorio y del CRUD verifican que la fachada no
  introduzca regresiones en fases anteriores.

## Límites del piloto

- Sólo Equipos de Catequistas activa DataGrid.
- No se migraron todavía los pies con agregaciones.
- No se incorporaron selección de filas, virtualización ni drag-and-drop.
- La revisión manual en Electron continúa como control previo a release.

## Puerta de salida

- [x] Piloto limitado a un reporte.
- [x] Consultas y exportación CSV preservadas.
- [x] Orden, filtros, paginación y visibilidad disponibles.
- [x] Responsive verificado mediante Playwright.
- [x] Pruebas unitarias y E2E añadidas.
- [x] Lint sin errores.
- [x] Type-check aprobado.
- [x] Suite unitaria completa aprobada (310 pruebas).
- [x] Playwright de fases 2–4 aprobado (16 casos).
- [x] Build estático aprobado (31 rutas).
- [x] DataGrid verificado dentro de Electron.

## Evidencia de cierre técnico

Validado el 31 de julio de 2026:

- `npm test`: 12 archivos y 310/310 pruebas aprobadas.
- `npm run type-check`: aprobado.
- `npm run lint`: 0 errores; permanecen 179 advertencias preexistentes.
- Playwright de laboratorio, Ciudades y reportes: 16/16 casos aprobados en
  Chromium desktop y mobile.
- `npm run build`: compilación y exportación estática de 31 rutas aprobadas.
- `git diff --check`: aprobado; sólo informa la normalización LF/CRLF del
  entorno Windows.

La fase 4 queda cerrada técnicamente para el renderer web. La expansión a otros
reportes debe mantener activación individual y validar por separado los pies
con agregaciones.

## Evolución posterior

El despliegue general a los cinco reportes se documenta en
[`phase-4-datagrid-rollout.md`](phase-4-datagrid-rollout.md). El piloto se
mantiene aquí como registro de la decisión y de su puerta de salida original.
