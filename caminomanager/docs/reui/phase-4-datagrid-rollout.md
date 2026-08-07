# ReUI: despliegue de DataGrid en todos los reportes

Fecha: 5 de agosto de 2026.

## Resultado

Los cinco reportes productivos usan la fachada local
`@/components/ui/data-grid`. La expansión conserva las consultas de Supabase,
la exportación CSV, los filtros, el orden, la agrupación y la impresión donde
ya existía.

## Alcance

- Equipos de Catequistas.
- Presbíteros.
- Responsables de Comunidades.
- Catequesis por Parroquia.
- Estado de Comunidades.

Los primeros cuatro reutilizan `DynamicReportTable`. Estado de Comunidades
mantiene su modelo de matriz de parroquias por etapa, pero ahora construye sus
columnas dinámicas con TanStack Table y las representa mediante la misma
fachada DataGrid.

## Adaptaciones incorporadas

- pie opcional y reutilizable dentro de DataGrid;
- totales calculados sobre todos los registros filtrados, no sólo la página
  visible;
- pies sincronizados con la visibilidad de columnas;
- clases configurables para encabezados y celdas, necesarias para la columna
  fija y los totales de la matriz;
- paginación y selector de columnas en todos los reportes dinámicos;
- orden accesible mediante botones de encabezado y `aria-sort`;
- identificación estable mediante `data-slot="data-grid"` para pruebas E2E;
- overflow horizontal explícito en viewport móvil;
- estados de carga y vacío dentro del propio DataGrid.

## Compatibilidad preservada

La matriz Estado de Comunidades conserva:

- la columna Parroquia fija al desplazarse horizontalmente;
- el total por parroquia, por paso y general;
- la exportación CSV completa;
- la vista de impresión con todas las filas;
- el contador de parroquias y comunidades.

Presbíteros, Responsables de Comunidades y Catequesis por Parroquia conservan
sus pies agregados. La paginación no altera el resultado de esos cálculos.

## Pruebas

- `DynamicReportTableDataGrid.test.tsx` verifica paginación, orden accesible,
  visibilidad y agregaciones sobre todos los resultados filtrados.
- `all-reports-datagrid.spec.ts` recorre los cinco reportes en Chromium desktop
  y mobile, comprueba la fachada común, el responsive y los totales de la
  matriz.
- `catechist-teams-datagrid.spec.ts` conserva la prueba profunda de orden,
  filtro, paginación y visibilidad del piloto original.

## Evidencia de validación

Validado el 5 de agosto de 2026:

- `npm test`: 13 archivos y 313/313 pruebas aprobadas;
- `npm run type-check`: aprobado;
- `npm run lint`: 0 errores y 177 advertencias preexistentes;
- Playwright de reportes: 12/12 casos aprobados en Chromium desktop y mobile;
- `npm run build`: compilación y exportación estática de 31 rutas aprobadas.

## Fuera de alcance

- virtualización de filas;
- selección masiva;
- reordenamiento de columnas por drag-and-drop;
- persistencia de preferencias de columnas entre sesiones.

Estas capacidades sólo se incorporarán si el volumen real o la investigación
de uso demuestra que compensan su complejidad.
