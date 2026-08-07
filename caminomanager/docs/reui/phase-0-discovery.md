# ReUI: fase 0 — descubrimiento y visión de adopción

- Estado: Completada
- Fecha de formalización: 2026-07-31
- Origen: análisis inicial de la migración Shadcn/UI → ReUI
- Siguiente artefacto: [fase 1 — línea base y criterios de entrada](phase-1-baseline.md)

## Propósito

Esta fase define el problema antes de seleccionar o instalar componentes. Su
resultado no es una migración visual, sino una visión compartida de:

- qué dificultades de uso queremos resolver;
- dónde ReUI ofrece una mejora material sobre la capa actual;
- qué componentes conviene conservar;
- cómo limitar el riesgo técnico y de mantenimiento;
- qué evidencia debe demostrar que el cambio fue beneficioso.

La fase se formaliza de manera retrospectiva porque el análisis se realizó antes
de crear los artefactos de la fase 1, pero no estaba disponible en la rama actual.

## Problema que queremos resolver

ComunidadCat administra relaciones jerárquicas y flujos con una carga de datos
considerable: países, departamentos, ciudades, diócesis, parroquias, comunidades,
personas, equipos, etapas e inventario. La capa Shadcn/UI existente ofrece buenas
primitivas, pero varias interacciones complejas se resuelven mediante composición
local o controles HTML directos.

Los principales problemas de experiencia identificados son:

1. **Selección de relaciones:** los `Select` simples pierden eficacia cuando las
   listas crecen y no siempre permiten buscar, limpiar o comprender dependencias.
2. **Formularios extensos:** etiqueta, ayuda, error, obligatoriedad y estado
   asíncrono no siempre forman un sistema visual y accesible uniforme.
3. **Acciones destructivas:** las confirmaciones deben comunicar consecuencias,
   elegir un foco inicial seguro y conservar el contexto al cerrar.
4. **Tablas y reportes:** ordenar, filtrar, paginar, mostrar estados vacíos y operar
   en móvil exige mucha composición alrededor de TanStack Table.
5. **Flujos por pasos:** cargas masivas y formularios complejos necesitan progreso,
   validación por etapa y recuperación clara ante errores.
6. **Consistencia:** conviven componentes de la fachada, primitivas Radix directas
   y controles HTML con convenciones visuales y de interacción distintas.

## Usuarios y tareas críticas

La migración debe favorecer primero las tareas repetidas de administración, sin
alterar las reglas de permisos existentes.

| Perfil | Tareas relevantes para la UI |
| --- | --- |
| Administrador | crear, editar, eliminar, asignar relaciones y gestionar permisos |
| Contribuidor | mantener datos dentro de su alcance y navegar jerarquías |
| Responsable o jefe de zona | consultar y actualizar comunidades o parroquias autorizadas |
| Viewer | explorar información sin recibir controles de edición |

Tareas críticas para evaluar cualquier componente nuevo:

- crear y editar una entidad con relaciones;
- encontrar una opción extensa mediante teclado y búsqueda;
- corregir errores sin perder los datos ingresados;
- cancelar o confirmar una eliminación comprendiendo su efecto;
- filtrar y recorrer un reporte en escritorio y móvil;
- conservar visibilidad y acciones correctas según el rol.

## Comparación orientada a decisiones

ReUI no se considera un reemplazo completo de Shadcn/UI. Ambos distribuyen código
que pasa a ser mantenido por el proyecto y se apoyan en las convenciones de
shadcn. La diferencia útil para ComunidadCat está en la disponibilidad de
composiciones más avanzadas y ejemplos de interacción.

| Necesidad | Capa actual | Oportunidad con ReUI | Decisión inicial |
| --- | --- | --- | --- |
| Botones, tarjetas, separadores y skeletons | estable y ampliamente usada | mejora principalmente estética | conservar |
| Selectores de relaciones | `Select` y modales de selección locales | búsqueda, vacío, limpieza y teclado con `Combobox` | candidato prioritario |
| Formularios | React Hook Form + Zod + `Form` local | estructura consistente con `Field/Form` | candidato prioritario |
| Confirmación destructiva | `Dialog` adaptado localmente | semántica y foco de `AlertDialog` | candidato prioritario |
| Reportes | TanStack Table + composición propia | `DataGrid`, filtros, loading y controles de columnas | laboratorio separado |
| Carga masiva | wizard local | `Stepper` y estados de progreso | evaluar después del piloto |
| Navegación | sidebar y overlays propios | patrones responsive adicionales | evaluar al final |

## Hipótesis de valor

La adopción será exitosa si demuestra estas hipótesis:

1. Un `Combobox` reduce fricción en relaciones grandes sin perder accesibilidad ni
   rendimiento.
2. Un contrato uniforme de campos hace que los errores sean más fáciles de ubicar
   y reduce estilos correctivos globales.
3. `AlertDialog` vuelve predecibles el foco y la cancelación de operaciones
   destructivas.
4. `DataGrid` reduce código de composición en reportes sin sacrificar la
   experiencia móvil ni acoplar los datos al componente.
5. Mantener una fachada propia permite probar o retirar ReUI sin reescribir las
   pantallas de negocio.

## Alcance

### Incluido

- controles de selección y formularios del CRUD genérico;
- confirmaciones destructivas;
- un laboratorio de tabla con datos aislados;
- estados de carga, vacío, error y deshabilitado;
- navegación por teclado, foco, nombres accesibles y responsive;
- temas claro y oscuro cuando el componente use tokens semánticos;
- compatibilidad con exportación estática y Electron;
- pruebas unitarias y Playwright específicas para los componentes adoptados.

### Fuera de alcance inicial

- reemplazar todas las primitivas Shadcn/UI;
- rediseñar la identidad visual o la navegación completa;
- migrar simultáneamente todos los CRUD y reportes;
- cambiar React Hook Form, Zod, TanStack Table o React Query;
- adoptar bloques premium antes de que un componente gratuito pruebe su valor;
- mezclar Base UI y Radix UI sin una decisión arquitectónica adicional;
- modificar permisos, consultas de Supabase o reglas de dominio como parte del
  cambio visual.

## Principios de adopción

1. **Valor antes que uniformidad:** sólo migrar donde exista una mejora funcional.
2. **Un componente a la vez:** laboratorio, pruebas, piloto y expansión.
3. **Fachada estable:** las pantallas consumen `@/components/ui/*`, no rutas del
   proveedor.
4. **Accesibilidad como contrato:** rol, nombre, teclado y foco son criterios de
   aceptación, no una revisión posterior.
5. **Responsive por diseño:** una tabla de escritorio no se considera terminada
   hasta definir su comportamiento móvil.
6. **Procedencia verificable:** registrar origen, versión, hash, dependencias y
   adaptaciones de todo código copiado.
7. **Reversibilidad:** cada incorporación debe poder retirarse sin una migración
   transversal.

## Métricas de éxito

La fase 1 establece los valores técnicos iniciales. A partir de ellos, cada piloto
se evaluará con estas métricas:

| Dimensión | Criterio de éxito |
| --- | --- |
| Funcional | crear, editar, cancelar y eliminar conservan el comportamiento actual |
| Teclado | el flujo principal puede completarse sin ratón |
| Foco | apertura, error, cancelación y cierre dejan el foco en un lugar predecible |
| Accesibilidad | etiquetas, errores y estados tienen nombre o descripción accesible |
| Responsive | no hay overflow de página; tablas anchas contienen su propio scroll |
| Calidad | type-check, unitarias, build estático y suites Playwright aprobados |
| Compatibilidad | verificación web y Electron por cada componente promovido |
| Mantenimiento | 100 % de componentes ReUI adoptados registrados con procedencia |
| Acoplamiento | 0 imports de ReUI desde componentes de dominio o páginas |
| Regresión | las pruebas existentes de roles y visibilidad siguen aprobando |

No se afirmará una reducción de tiempo de tarea o errores de usuario sin
instrumentación o pruebas de usabilidad. Mientras no exista esa medición, los
criterios de teclado, foco, búsqueda y recuperación de errores serán indicadores
observables, no equivalentes a métricas de producto.

## Riesgos y mitigaciones

| Riesgo | Mitigación acordada |
| --- | --- |
| código copiado se desactualiza | registro de procedencia y revisión explícita de upgrades |
| aumenta el bundle | medir cada candidato y evitar instalar colecciones completas |
| regresiones de foco o teclado | pruebas por roles accesibles y secuencias reales de teclado |
| selectores E2E acoplados al proveedor | no usar clases ni atributos internos de Radix/ReUI |
| tokens alteran el tema existente | introducirlos en laboratorio y comparar claro/oscuro |
| tabla avanzada falla en móvil | scroll contenido y alternativa compacta cuando sea necesario |
| Electron difiere del navegador | verificar el renderer estático antes de promover el componente |
| migración crece sin evidencia | puertas de aceptación y pausa si el piloto no mejora el flujo |

## Hoja de ruta acordada

| Fase | Objetivo | Resultado esperado |
| --- | --- | --- |
| 0. Descubrimiento | comprender problema, alternativas y éxito | este documento |
| 1. Línea base y arquitectura | medir el estado y limitar el acoplamiento | auditor, ADR, pilotos y contrato E2E |
| 2. Laboratorio | instalar y aislar candidatos | compatibilidad y APIs verificadas |
| 3. Piloto CRUD | validar valor en una entidad real | Ciudades con Combobox, Field/Form y AlertDialog |
| 4. Tablas y reportes | evaluar DataGrid y filtros | decisión de adopción con evidencia responsive |
| 5. Formularios complejos | extender patrones aprobados | Personas, Comunidades y cargas por pasos |
| 6. Navegación y limpieza | retirar deuda y unificar estilos | overlays responsive y estilos antiguos reducidos |

Cada fase puede detener la expansión. Completar una fase no obliga a adoptar todos
los candidatos de la siguiente.

## Decisiones entregadas a la fase 1

- adopción selectiva, no reemplazo total;
- prioridad para `Combobox`, `Field/Form` y `AlertDialog`;
- `DataGrid` como experimento independiente;
- preservación de la fachada `@/components/ui/*`;
- variantes Radix UI preferidas para evitar mezclar primitivas;
- Playwright como puerta de interacción y responsive;
- compatibilidad con exportación estática y Electron como requisito.

La fase 1 convirtió estas decisiones en el
[ADR 0001](../adr/0001-selective-reui-adoption.md) y en una línea base
reproducible.

## Puerta de salida de fase 0

- [x] Problema y usuarios afectados identificados.
- [x] Comparación Shadcn/UI–ReUI orientada a necesidades reales.
- [x] Alcance y no-alcance definidos.
- [x] Hipótesis y métricas de éxito documentadas.
- [x] Riesgos y mitigaciones registrados.
- [x] Estrategia selectiva recomendada.
- [x] Hoja de ruta por fases acordada.
- [x] Insumos entregados a la fase 1.

## Fuentes de referencia

- [ReUI — introducción](https://reui.io/docs)
- [ReUI — primeros pasos y registro](https://reui.io/docs/get-started)
- [ReUI — estilos y tokens semánticos](https://reui.io/docs/styling)
- [ReUI — Data Grid para Radix UI](https://reui.io/docs/components/radix/data-grid)
- [shadcn/ui — documentación](https://ui.shadcn.com/docs)
