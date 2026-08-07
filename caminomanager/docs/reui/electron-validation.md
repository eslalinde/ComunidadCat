# ReUI: validación transversal en Electron

Fecha: 31 de julio de 2026.

## Resultado

La compatibilidad con Electron dejó de depender de una comprobación informal.
El smoke test `renderer-smoke.spec.ts` inicia la aplicación real sobre el export
estático, usa una sesión temporal aislada y cierra Electron al finalizar.

La validación fue aprobada en Windows con Electron 41 y Playwright 1.58.

## Cobertura

- carga del renderer exportado desde `out/`;
- disponibilidad del puente `window.electronAPI` con `contextIsolation` activo;
- maximizar y restaurar la ventana sin marco;
- autenticación contra Supabase local;
- Sidebar, ruta activa y migas de pan;
- Autocomplete y Field/Form en el modal real de Ciudades;
- apertura y cancelación segura de AlertDialog;
- DataGrid del reporte Equipos de Catequistas;
- Stepper del asistente de carga masiva, sin confirmar ni escribir datos.

Durante el smoke test se desactivan DevTools y se usa un directorio temporal de
datos. El perfil normal de Electron y su sesión no se modifican.

## Ejecución

El export debe estar compilado con las variables del Supabase local y los
usuarios E2E deben existir. Después se ejecuta:

```bash
npm run test:electron
```

El comando compila `electron/main.ts` y `electron/preload.ts`, lanza una sola
instancia y ejecuta `playwright.electron.config.ts`.

## Evidencia

Validado el 31 de julio de 2026:

- `npm run test:electron`: 1/1 smoke test aprobado;
- puente preload y controles de ventana aprobados;
- navegación autenticada y cuatro patrones UI aprobados;
- capturas revisadas para Ciudades, DataGrid y Stepper;
- `npm run type-check`: aprobado;
- `npm run lint`: 0 errores; 177 advertencias preexistentes.

Las capturas son artefactos locales ignorados por Git. En CI, los traces y
screenshots de fallo se escriben bajo `e2e/test-results-electron/`.

