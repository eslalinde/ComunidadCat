# ADR 0001: Adopción selectiva de ReUI

- Estado: Aceptado
- Fecha: 2026-07-31
- Responsables: equipo de ComunidadCat
- Descubrimiento: [fase 0 — visión de adopción](../reui/phase-0-discovery.md)

## Contexto

ComunidadCat ya usa una capa propia de componentes en `@/components/ui/*`, generada
originalmente con shadcn/ui y construida sobre Radix UI. La aplicación debe seguir
funcionando con React 19, Tailwind CSS 4, la exportación estática de Next.js y el
renderer de Electron.

ReUI ofrece componentes y patrones más completos para selección, formularios y
tablas. También distribuye código mediante un registro compatible con la CLI de
shadcn. Copiar esos componentes da control sobre el código, pero transfiere al
proyecto la responsabilidad de mantenerlo, probarlo y registrar su procedencia.

Una sustitución masiva aumentaría el riesgo de regresiones visuales, de foco y de
accesibilidad sin aportar el mismo valor en todos los controles existentes.

## Decisión

Adoptaremos ReUI de forma selectiva e incremental.

1. `@/components/ui/*` seguirá siendo la API pública de la interfaz. El código de
   aplicación no importará directamente componentes copiados desde ReUI.
2. Los componentes ReUI se incorporarán primero en un laboratorio y después se
   expondrán mediante adaptadores con la API mínima que necesita ComunidadCat.
3. Se conservarán los componentes shadcn actuales cuando no exista una mejora
   funcional o de usabilidad medible.
4. El primer piloto CRUD evaluará, en este orden, `Combobox`, `Field/Form` y
   `AlertDialog`. `DataGrid` se evaluará en paralelo sobre el TanStack Table v8
   existente, sin reemplazar inicialmente `DynamicReportTable`.
5. Usaremos las variantes Radix UI de ReUI para reducir la mezcla de primitivas.
   Adoptar Base UI requerirá un ADR adicional.
6. No se cambiará globalmente el estilo `new-york` de `components.json` para
   instalar ReUI. La configuración exacta del registro y los tokens extendidos se
   validará en el laboratorio de la fase 2.
7. Cada componente copiado se registrará en
   `docs/reui/component-provenance.json` con URL, entrada del registro, variante,
   fecha, hash del código recibido, dependencias y adaptaciones locales.
8. Los selectores E2E usarán rol, nombre accesible y etiqueta. Los atributos
   internos de Radix/ReUI no forman parte del contrato de pruebas.

## Puertas de aceptación por componente

Un componente sólo puede pasar del laboratorio a producción cuando cumple todas
estas condiciones:

- compila con React 19, TypeScript estricto y Tailwind CSS 4;
- funciona en la exportación estática y en Electron;
- conserva navegación por teclado, foco, cierre con Escape y mensajes accesibles;
- tiene estados vacío, cargando, error, deshabilitado y móvil cuando apliquen;
- cuenta con pruebas unitarias del adaptador y pruebas Playwright en Chromium de
  escritorio y móvil;
- no obliga a consumidores de negocio a importar rutas internas de ReUI;
- su procedencia está registrada y sus cambios locales están documentados.

## Consecuencias

### Positivas

- La migración se puede revertir por componente.
- La aplicación conserva una API de UI estable.
- El valor y el coste de cada incorporación se pueden comparar contra la línea
  base antes de ampliar el alcance.
- Las pruebas quedan desacopladas de la implementación interna del proveedor.

### Costes y riesgos

- El equipo mantiene el código copiado y debe revisar actualizaciones de ReUI.
- Durante la transición coexistirán implementaciones antiguas y nuevas.
- Algunos componentes pueden añadir tokens, dependencias o peso de bundle.
- `DataGrid` puede degradar la experiencia móvil si se adopta sin un diseño
  responsive específico.

## Alternativas descartadas

- **Reemplazo total:** demasiado riesgo y poco beneficio para primitivas estables
  como `Button`, `Card`, `Separator` o `Skeleton`.
- **Importar ReUI directamente en cada pantalla:** acopla el dominio al proveedor y
  dificulta una reversión.
- **No adoptar ReUI:** evita trabajo inmediato, pero mantiene selectores y tablas
  complejas construidos de forma ad hoc.

## Revisión de la decisión

Revisar este ADR al cerrar el piloto CRUD. Si dos o más candidatos no superan sus
puertas de aceptación, se detendrá la expansión y se documentará si conviene
mantener shadcn o evaluar otra alternativa.
