# Landing y capturas de ComunidadCat

La landing estática vive en la raíz de la rama `gh-pages`, separada de la
aplicación Next.js. No necesita compilación, dependencias, autenticación ni
analítica. Este documento y el script de datos demo se mantienen en `dev`.

- Español: <https://eslalinde.github.io/ComunidadCat/>
- Inglés: <https://eslalinde.github.io/ComunidadCat/index.en.html>
- Aplicación: <https://comunidad-cat.vercel.app/>

## Revisar la landing

Desde el repositorio, crea un checkout independiente para los cambios del sitio:

```powershell
git fetch origin
git worktree add -b feature/landing-update ../ComunidadCat-landing origin/gh-pages
python -m http.server 4174 --bind 127.0.0.1 --directory ../ComunidadCat-landing
```

Abre `http://127.0.0.1:4174/` y `/index.en.html`. Detén el servidor con Ctrl+C.
Si ya existe ese checkout, reutilízalo. La rama contiene:

- `index.html` e `index.en.html`: contenido, metadatos, capturas y preguntas frecuentes.
- `styles.css`: diseño adaptable, foco de teclado y movimiento reducido.
- `assets/logo.png`: el logo de ComunidadCat.
- `assets/comunidad.jpg`, `assets/equipo-catequistas.jpg` y
  `assets/informe-comunidades.jpg`: capturas de la aplicación con datos ficticios.
- `.nojekyll`: publicación estática directa.

Mantén sincronizados los dos idiomas. Los selectores de idioma usan páginas
independientes, sin JavaScript ni almacenamiento del navegador. Cada página
declara `lang`, metadatos localizados, enlaces `hreflang` y `aria-current`.
Las rutas de recursos y navegación son relativas. La aplicación y sus capturas
siguen en español; no anuncies una aplicación en inglés.

## Preparar los datos demo locales

Requiere Node.js 22.12 o superior, las dependencias de `caminomanager` instaladas
con `npm ci` y una instancia **local** de Supabase con todas las migraciones y
`supabase/seed.sql` aplicados. Usa el CLI fijado por el repositorio, 2.122.0.
No resetees una base existente para generar capturas.

Desde `caminomanager`, ejecuta una sola vez:

```powershell
node scripts/seed-landing-demo.mjs
```

El destino es PostgreSQL en `127.0.0.1:54322`, base y usuario `postgres`, con la
contraseña local estándar. Solo se puede cambiar el puerto, para probar con una
instancia local independiente:

```powershell
node scripts/seed-landing-demo.mjs --port 56322
```

El script fija host, base, usuario y contraseña; no usa `DATABASE_URL`, las
variables `PG*` ni credenciales cloud. Antes de escribir valida Colombia (ID 1),
Antioquia (ID 2), los tipos Catequistas/Responsables (IDs 3/4) y las dos primeras
etapas (IDs 1/2) del seed. Los carismas y géneros siguen las opciones de la app.

La transacción crea una ciudad, zona, diócesis, parroquia, comunidad, 12 personas,
cuatro matrimonios, dos equipos con tres miembros cada uno, un presbítero, dos
registros de etapa y una cuenta local con rol `zone_leader`, limitada a la zona
demo. Usa IDs negativos reservados entre `-1030012` y `-1030000`; los nombres y
lugares son ficticios, sin teléfonos ni direcciones de contacto personales.

La cuenta local es `landing-demo@example.test`, con contraseña
`LocalDemoOnly-2026!`. Es un usuario de prueba preconfirmado; no es una cuenta
productiva ni requiere cambiar la configuración de confirmación por correo.
El script comprueba el perfil, los 12 hermanos y los dos equipos antes del commit.
Ante cualquier fallo revierte la transacción. Si la comunidad ya existe, termina
con código 1 sin modificarla: reutiliza el fixture; no borres datos para repetirlo.

## Reproducir las capturas

1. Compila la aplicación desde `caminomanager` con `npm run build:e2e`, usando
   `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` y la clave pública **local**
   en `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`. Deja vacío
   `NEXT_PUBLIC_SENTRY_DSN`. Si usas puertos distintos, ajusta la URL al puerto
   API de esa instancia, no al de PostgreSQL.
2. Inicia `node scripts/serve-e2e.mjs` y accede a
   `http://127.0.0.1:3100/login` con la cuenta demo.
3. Usa una ventana de 1280 × 1040 y contrae la barra lateral con su control.
4. Para `comunidad.jpg`, captura `/comunidades/detalle?id=-1030000` desde arriba.
   La captura original tiene 1265 × 1028 píxeles.
5. Para `equipo-catequistas.jpg`, aumenta el alto a 1200 y recorta la tarjeta
   completa de catequistas, incluidos encabezado, parroquia y ambas filas.
   El recorte original mide 590 × 286.
6. Para `informe-comunidades.jpg`, abre `/reportes/lideres-comunidades` y usa
   **Columnas** para conservar Parroquia, Comunidad, Etapa del camino,
   Responsable, Catequistas y # hermanos. Captura los 1280 × 540 píxeles
   superiores, incluidos título y tabla poblada.
7. Revisa que no haya estados de carga, errores ni datos ajenos al fixture.
   Usa los controles normales del producto; no edites el DOM ni los textos
   de la interfaz. Cierra la sesión demo al terminar.

Las capturas originales se tomaron el 30 de octubre de 2026. Al sustituirlas,
actualiza también sus descripciones en ambos idiomas. Las capturas pueden abrirse
a tamaño original desde la landing. ESLint excluye `e2e/screenshots/**`, que es
una carpeta de artefactos locales, no código fuente.

## Publicar una actualización

Revisa el diff de la rama del sitio, confirma únicamente los archivos estáticos
y su README y actualiza `gh-pages` sin force-push, según el flujo de revisión
del repositorio. Pages publica esa rama desde `/`; confirma que el despliegue
termine correctamente y revisa ambas páginas, selectores de idioma y recursos.
Los metadatos canonical, `hreflang` y las vistas previas sociales deben usar las
URLs públicas indicadas arriba.

No copies el script demo, credenciales, fuentes de la app ni instaladores a
`gh-pages`. No crees releases ni tags de Electron para cambios de la landing.
La aplicación conserva su despliegue independiente en Vercel.

Añade el aviso de privacidad y una vía de contacto cuando estén aprobados;
no inventes datos de contacto.
