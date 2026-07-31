# ReUI: fase 3 — piloto productivo en Ciudades

Fecha: 31 de julio de 2026.

## Resultado

El CRUD de Ciudades es el primer consumidor productivo de los contratos
evaluados en el laboratorio. El cambio mantiene `EntityPage` y
`DynamicEntityModal`, y activa Autocomplete sólo mediante la propiedad
`searchable` del esquema de campos.

## Cambios del piloto

### País y Departamento con búsqueda

Los campos `country_id` y `state_id` de `cityConfig` usan Autocomplete. El
Departamento permanece deshabilitado hasta elegir un País y sus opciones se
actualizan con el hook dependiente existente. Los valores continúan pasando por
`prepareFormData`, por lo que Supabase recibe identificadores numéricos.

La capacidad es opt-in: los demás CRUD conservan Select hasta ser evaluados de
forma individual. El formulario también asocia textos de ayuda mediante
`FormDescription`.

### Confirmación destructiva

`ConfirmDeleteDialog` conserva su API y la escritura de la palabra de
confirmación, pero ahora usa AlertDialog. Esto aporta semántica destructiva,
foco inicial en Cancelar, cierre con Escape y retorno de foco al disparador.
La acción no cierra el diálogo mientras la eliminación esté pendiente.

La migración de este componente es transversal porque todos sus consumidores
comparten el mismo contrato; no cambia las operaciones ni los permisos de
borrado.

### Acciones con nombre accesible

Los botones de tabla ahora anuncian `Editar <registro>` y
`Eliminar <registro>`. Playwright puede usar nombres accesibles estables y los
lectores de pantalla dejan de depender únicamente del icono o del tooltip.

## Pruebas

- `DynamicEntityModalPhase3.test.tsx`: alcance opt-in, dependencia País →
  Departamento y normalización antes de guardar.
- `ConfirmDeleteDialog.test.tsx`: semántica AlertDialog, foco seguro,
  confirmación escrita, cancelación y carga.
- `cities-reui.spec.ts`: formulario y diálogo reales sobre `/ciudades` en los
  proyectos desktop y mobile. Incluye un ciclo CRUD persistente con nombres
  únicos por proyecto y limpieza defensiva del registro temporal.

La suite Playwright del CRUD requiere Supabase local y los usuarios creados por
`npm run seed:e2e`. En Windows debe ejecutarse desde PowerShell dentro de
`caminomanager`; npm resolverá el `tsx.cmd` local sin delegar en `npx` ni WSL.

## Estado de adopción

Autocomplete, Field/Form y AlertDialog pasan de `local-prototype` a
`production-pilot`. No se registran todavía como `adoptedComponents`: falta
fijar el artefacto upstream con versión y hash exigido por la ADR. DataGrid
permanece en laboratorio.

## Puerta de salida

- [x] Piloto limitado a Ciudades para Autocomplete.
- [x] Relaciones dependientes preservadas.
- [x] API de confirmación destructiva preservada.
- [x] Pruebas unitarias y Playwright añadidas.
- [x] Lint sin errores.
- [x] Type-check aprobado.
- [x] Unitarias aprobadas (308 pruebas).
- [x] Playwright del piloto aprobado en desktop y mobile (6 casos, incluido el
  ciclo CRUD persistente).
- [x] Build estático aprobado (31 rutas).
- [ ] Revisión manual en Electron.

## Evidencia de cierre técnico

Validado el 31 de julio de 2026:

- `npx playwright test e2e/ui/cities-reui.spec.ts`: 6/6 casos aprobados.
- `npm test`: 11 archivos y 308/308 pruebas aprobadas.
- `npm run type-check`: aprobado.
- `npx eslint e2e/ui/cities-reui.spec.ts`: aprobado sin advertencias.
- `git diff --check`: aprobado; sólo informa la normalización LF/CRLF del
  entorno Windows.

La fase 3 queda cerrada técnicamente para el renderer web. La revisión manual
en Electron se conserva como control previo a release porque valida el
empaquetado y la interacción en la ventana nativa, no la lógica del piloto.
