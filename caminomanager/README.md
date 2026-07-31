# ComunidadCat

Este proyecto fue creado con [Next.js](https://nextjs.org/) y [Supabase](https://supabase.com/).

## Configuración inicial

1. Clona el repositorio y entra a la carpeta del proyecto:
   ```bash
   git clone <repo-url>
   cd caminomanager
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Crea un proyecto en [Supabase](https://app.supabase.com/).
4. Copia las claves públicas y privadas de tu proyecto Supabase.
5. Crea un archivo `.env.local` en la raíz del proyecto y agrega:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=tu_anon_key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```
   
   > **Nota:** En producción, `NEXT_PUBLIC_SITE_URL` debe ser la URL de tu dominio (ej: `https://tudominio.com`).
6. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## Emails locales (Inbucket)

En desarrollo local, los emails que genera Supabase Auth (confirmación de cuenta, reset de password, magic links) son capturados por **Inbucket**, un servidor de email falso incluido en el stack de Supabase.

- **Interfaz web:** [http://localhost:54324](http://localhost:54324)
- Se abre automáticamente al ejecutar `supabase start`
- Todos los emails enviados por Auth aparecen ahí (no se envían emails reales)

**Flujo típico de registro:**
1. El usuario se registra en la app
2. Abrir [http://localhost:54324](http://localhost:54324)
3. Buscar el email de confirmación en la bandeja de entrada
4. Hacer click en el link de confirmación
5. El usuario ya puede hacer login

## Base de datos (Supabase)

Las instrucciones para **desplegar las migraciones de la base de datos a Supabase Cloud** están en el README raíz del repo: `../README.md`.

## Scripts

- `npm run dev` — Inicia el servidor de desarrollo
- `npm run build` — Compila la aplicación para producción
- `npm start` — Inicia la aplicación en modo producción
- `npm run ui:audit` — Recalcula la línea base de componentes y estilos

## Arquitectura de interfaz

- [Descubrimiento y visión de adopción — fase 0](docs/reui/phase-0-discovery.md)
- [ADR de adopción selectiva de ReUI](docs/adr/0001-selective-reui-adoption.md)
- [Línea base y criterios de la fase 1](docs/reui/phase-1-baseline.md)
- [Laboratorio de componentes — fase 2](docs/reui/phase-2-component-lab.md)
- [Piloto productivo en Ciudades — fase 3](docs/reui/phase-3-cities-pilot.md)
- [Piloto DataGrid en reportes — fase 4](docs/reui/phase-4-reports-datagrid.md)
- [Formularios complejos y Stepper — fase 5](docs/reui/phase-5-complex-forms.md)
- [Navegación responsive y limpieza — fase 6](docs/reui/phase-6-navigation-cleanup.md)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
