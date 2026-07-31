# ReUI: fase 6 — navegación responsive y limpieza

Fecha: 31 de julio de 2026.

## Resultado

La navegación principal conserva la fachada Sidebar existente y mejora su
comportamiento responsive sin reemplazar toda la estructura. El drawer móvil
ahora se cierra después de seleccionar una ruta, devuelve el foco al disparador
al cancelarse y comunica cuál es la página actual.

Las migas de pan usan semántica de lista, marcan el destino actual y limitan el
ancho de textos largos en pantallas pequeñas. Los textos accesibles del Sidebar
y Sheet quedaron unificados en español.

## Mejoras de usabilidad

- cierre automático del menú móvil al navegar;
- cierre con `Escape` y retorno de foco al botón que abrió el menú;
- `aria-current="page"` en el enlace activo del Sidebar y en la última miga;
- nombres accesibles `Menú principal`, `Alternar menú principal`, `Cerrar` y
  `Migas de pan`;
- estructura `ol`/`li` para las migas y truncado responsive;
- navegación desktop preservada, incluido el colapso existente.

## Limpieza visual

- los colores de marca incrustados en el shell, avatares, notificación de
  actualización y carga masiva se sustituyeron por tokens `primary`;
- se retiraron las reglas globales `data-radix-form-field` y
  `data-radix-form-control`, que no tenían consumidores;
- la hoja global pasó de las 769 líneas de la línea base a 757;
- las declaraciones `!important` quedaron en 14 y están limitadas al popover,
  el input de fecha y la salida impresa.

Los estilos de impresión se conservan: sus colores y resets son deliberados y
no deben compartir los tokens de la interfaz interactiva.

## Pruebas

`responsive-navigation.spec.ts` cubre en Chromium desktop y mobile:

- ruta inicial marcada;
- apertura y cierre del drawer;
- retorno de foco después de `Escape`;
- navegación a Ciudades y cierre automático en móvil;
- nueva ruta marcada como actual;
- estructura y estado actual de las migas en una ruta anidada de reportes.

## Puerta de salida

- [x] Navegación responsive mejorada sin cambiar permisos ni rutas.
- [x] Estado actual expuesto a tecnologías de asistencia.
- [x] Textos accesibles en español.
- [x] Selectores globales obsoletos retirados.
- [x] Colores del shell alineados con tokens de tema.
- [x] Suite Playwright específica aprobada (4 casos).
- [x] Suite unitaria completa aprobada (312 pruebas).
- [x] Type-check aprobado.
- [x] Lint sin errores.
- [x] Playwright de fases 2–6 aprobado (22 casos).
- [x] Build estático aprobado (31 rutas).
- [ ] Revisión manual en Electron.

## Evidencia de cierre técnico

Validado el 31 de julio de 2026:

- `npm run ui:audit`: 757 líneas de CSS global y 14 declaraciones
  `!important` restantes;
- `npm test`: 13 archivos y 312/312 pruebas aprobadas;
- `npm run type-check`: aprobado;
- `npm run lint`: 0 errores; permanecen 177 advertencias preexistentes;
- Playwright de laboratorio y fases 3–6: 22/22 casos aprobados en Chromium
  desktop y mobile;
- `npm run build`: compilación y exportación estática de 31 rutas aprobadas.

La hoja de ruta ReUI queda cerrada técnicamente para el renderer web. La
revisión manual en Electron continúa como puerta transversal previa a release.
