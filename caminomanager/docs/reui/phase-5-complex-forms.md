# ReUI: fase 5 — formularios complejos y Stepper

Fecha: 31 de julio de 2026.

## Resultado

El asistente de carga masiva de hermanos es el piloto productivo de `Stepper`.
La migración conserva el parser CSV, la validación, la selección opcional de
responsables y el servicio de escritura. El cambio se limita a la estructura de
progreso, la accesibilidad del selector de archivo y la comunicación del paso
activo.

## Selección del piloto

`BulkUploadWizard` ya implementaba un proceso real de cuatro pasos, pero su
indicador era sólo visual, ocultaba las etiquetas en pantallas pequeñas y no
exponía semánticamente el paso actual. Por eso permite validar el patrón en un
flujo complejo sin introducir una regla de negocio nueva.

Los formularios de persona, comunidad y parroquia permanecen fuera del piloto.
Se evaluarán después de comprobar este patrón y deberán migrarse de forma
independiente para no mezclar campos condicionales con la navegación por pasos.

## Capacidades incorporadas

- fachada pública `@/components/ui/stepper` con estados completado, actual y
  pendiente;
- navegación etiquetada, lista ordenada y `aria-current="step"`;
- texto de estado para lectores de pantalla;
- etiquetas de los cuatro pasos visibles también en viewport móvil;
- contenido del paso anunciado con `aria-live="polite"`;
- selector CSV asociado a una etiqueta y ayuda persistente mediante
  `aria-describedby`;
- cierre con `Escape` antes de confirmar, sin escrituras en la base de datos.

## Pruebas

- `BulkUploadWizardPhase5.test.tsx`: contrato semántico del Stepper y recorrido
  completo del asistente con parser y servicio aislados.
- `bulk-upload-stepper.spec.ts`: recorrido sobre la página real de comunidad en
  Chromium desktop y mobile, con un CSV creado en memoria y salida segura antes
  de ejecutar la carga.

## Límites del piloto

- El Stepper informa el progreso; los pasos no son enlaces arbitrarios.
- La confirmación y la persistencia siguen siendo responsabilidad del flujo
  existente.
- No se migraron formularios condicionales ni selectores relacionales en esta
  fase.
- La revisión manual en Electron continúa como control previo a release.

## Puerta de salida

- [x] Piloto limitado a un asistente existente.
- [x] Parser, validación y servicio de carga preservados.
- [x] Progreso semántico y etiquetas responsive incorporados.
- [x] Salida segura sin persistencia verificada.
- [x] Pruebas unitarias y E2E añadidas.
- [x] Lint sin errores.
- [x] Type-check aprobado.
- [x] Suite unitaria completa aprobada (312 pruebas).
- [x] Playwright de fases 2–5 aprobado (18 casos).
- [x] Build estático aprobado (31 rutas).
- [ ] Revisión manual en Electron.

## Evidencia de cierre técnico

Validado el 31 de julio de 2026:

- `npm test`: 13 archivos y 312/312 pruebas aprobadas.
- `npm run type-check`: aprobado.
- `npm run lint`: 0 errores; permanecen 177 advertencias preexistentes.
- Playwright de laboratorio, Ciudades, reportes y carga masiva: 18/18 casos
  aprobados en Chromium desktop y mobile.
- `npm run build`: compilación y exportación estática de 31 rutas aprobadas.

La fase 5 queda cerrada técnicamente para el renderer web. Antes de extender el
patrón a formularios condicionales se mantiene pendiente la revisión manual en
Electron.
