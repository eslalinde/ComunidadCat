# ReUI: despliegue en EntityTable y formularios complejos

Fecha: 5 de agosto de 2026.

## Resultado

`EntityTable` usa la fachada local DataGrid en escritorio para todos los CRUD.
Los formularios de Persona, Comunidad y Parroquia amplían el piloto de Ciudad
con Autocomplete, secciones responsive y un diálogo accesible.

No se modificaron consultas, reglas de validación, normalización de datos ni
mutaciones de Supabase.

## EntityTable

- TanStack Table adapta las columnas configuradas por `EntityPage` a DataGrid;
- el orden continúa siendo remoto y controlado por `useCrud`;
- los encabezados exponen `aria-sort` y se operan por teclado;
- las filas con navegación son activables con Enter o Espacio;
- anchos, valores personalizados, relaciones y acciones se preservan;
- el diálogo destructivo recupera el foco aunque React reconstruya la fila;
- móvil conserva las tarjetas compactas existentes, más apropiadas para CRUD
  que una tabla ancha.

## Formularios complejos

Se habilitó búsqueda en nueve relaciones:

- Persona: país actual, ciudad actual y cónyuge;
- Comunidad: parroquia, etapa y equipo de catequistas;
- Parroquia: diócesis, ciudad y zona.

`DynamicEntityModal` ahora usa el diálogo Radix local, con foco contenido,
cierre por Escape, título y descripción accesibles. Los formularios largos se
organizan en dos columnas desde `sm`, conservan una columna en móvil y muestran
secciones de dominio. Las relaciones condicionales siguen apareciendo sólo
cuando aplica:

- la ciudad actual depende del país actual;
- la ubicación aparece según vocación o estado itinerante;
- el cónyuge aparece para personas casadas;
- la zona depende de la ciudad seleccionada.

## Pruebas

- `EntityTable.test.tsx`: fachada DataGrid, orden accesible, relaciones,
  acciones, filas navegables y retorno de foco;
- `DynamicEntityModalPhase3.test.tsx`: piloto de Ciudad, nueve relaciones,
  secciones y ubicación condicional;
- `entity-datagrid-complex-forms.spec.ts`: recorrido sin escrituras por
  EntityTable, Persona, Comunidad y Parroquia en desktop y mobile;
- `cities-reui.spec.ts`: regresión del piloto, incluido el ciclo CRUD con
  limpieza defensiva.

## Evidencia de validación

Validado el 5 de agosto de 2026:

- `npm test`: 13 archivos y 317/317 pruebas aprobadas;
- `npm run type-check`: aprobado;
- `npm run lint`: 0 errores y 176 advertencias preexistentes;
- Playwright de Ciudad y despliegue: 14/14 casos aprobados en Chromium desktop
  y mobile;
- `npm run build`: compilación y exportación estática de 31 rutas aprobadas.

## Fuera de alcance

- convertir formularios cortos de entidades sin relaciones a dos columnas;
- sustituir selectores pequeños y cerrados, como Género o Estado, por búsqueda;
- persistir preferencias del DataGrid entre sesiones;
- incorporar edición inline o selección masiva en los CRUD.
