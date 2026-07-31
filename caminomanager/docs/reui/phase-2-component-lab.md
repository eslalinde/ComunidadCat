# ReUI: fase 2 — laboratorio de componentes

Fecha de evaluación: 31 de julio de 2026.

## Resultado

La fase 2 incorpora un laboratorio aislado en `/ui-lab`, sin Supabase y sin
reemplazar controles de los CRUD. La ruta no se enlaza desde la navegación y se
marca `noindex`. Se declara pública para que el laboratorio no dependa de una
sesión ni de Supabase durante Playwright; sólo contiene datos estáticos. Su
propósito es validar contratos públicos, interacción,
accesibilidad, responsive y compatibilidad con React 19, Tailwind 4, TanStack
Table y exportación estática.

Los cuatro candidatos permanecen como `local-prototype`: todavía no están
registrados como componentes ReUI adoptados porque no se ha fijado un artefacto
upstream con versión y `sha256`. Esta distinción evita atribuir a ReUI código que
es una adaptación local.

## Decisiones del laboratorio

### Autocomplete reemplaza a Combobox como candidato del CRUD

El catálogo actual de ReUI implementa Combobox sobre Base UI. La ADR de este
proyecto prefiere Radix y evita mezclar familias de primitivas sin una ventaja
demostrable. Para País y Departamento —selección simple con búsqueda— se evalúa
Autocomplete, que ReUI documenta en su variante Radix.

El prototipo local expone una API pequeña (`options`, `value`,
`onValueChange`) y cubre búsqueda, teclado, selección, limpieza, vacío, carga,
deshabilitado y atributos WAI-ARIA. Antes de promoverlo hay que comparar su API
con el artefacto oficial del registry y registrar hash, versión y adaptaciones.

### Field y AlertDialog son composiciones estándar

Field y AlertDialog aparecen en ReUI como ejemplos de componentes shadcn, no
como primitivas in-house. El laboratorio implementa la composición sobre la
fachada existente:

- `Field` normaliza etiqueta, descripción y error sin acoplarse a React Hook
  Form;
- `AlertDialog` usa el paquete `radix-ui` ya instalado y añade estilos mediante
  `buttonVariants`.

Esto permite medir el beneficio de UX sin añadir otra biblioteca de primitivas.

### DataGrid se valida por contrato, no por sustitución completa

El DataGrid oficial tiene un área de API y dependencias considerable. El
prototipo conserva la instancia actual de TanStack Table y valida primero:

- render de encabezados y celdas con `flexRender`;
- orden y `aria-sort`;
- estados cargando y vacío;
- filtro y paginación controlados por el consumidor;
- overflow horizontal en viewport móvil.

No incluye todavía visibilidad de columnas, filtros avanzados, selección,
virtualización ni drag-and-drop. Esas capacidades sólo se incorporarán si un
caso real del reporte las justifica.

## Archivos incorporados

| Área | Archivo |
| --- | --- |
| Registro del registry | `components.json` |
| Fachada | `src/components/ui/autocomplete.tsx` |
| Fachada | `src/components/ui/field.tsx` |
| Fachada | `src/components/ui/alert-dialog.tsx` |
| Fachada | `src/components/ui/data-grid.tsx` |
| Laboratorio | `src/components/ui-lab/ReuiLab.tsx` |
| Ruta | `src/app/ui-lab/page.tsx` |
| Unitarias | `src/__tests__/components/ReuiPhase2.test.tsx` |
| Playwright | `e2e/ui-lab/reui-components.spec.ts` |

## Contrato de prueba

Las unitarias comprueban asociación accesible de Field, filtro y selección por
teclado, estado vacío y gestión de foco de AlertDialog. Playwright replica el
flujo en navegador para escritorio y Pixel 5, y añade filtro, orden y paginación
del DataGrid usando roles y nombres accesibles.

Para ejecutar …4149 tokens truncated…+              />
            </Field>
            <DataGrid table={table} emptyMessage="No hay ciudades que coincidan" />
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                >
