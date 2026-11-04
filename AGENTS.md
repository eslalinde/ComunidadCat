# ComunidadCat - Agent Guidelines

## Project Overview

**ComunidadCat** is a community management system for Neocatechumenal Way communities. Built with **Next.js 15 + Electron + Supabase**, it runs both as a web app (Vercel) and a desktop app (Windows NSIS installer).

## Repository Layout

```
VibeCaminoManager/
├── caminomanager/           # Next.js + Electron application
│   ├── src/
│   │   ├── app/             # Next.js App Router
│   │   │   ├── (auth)/      # Login, Signup pages
│   │   │   ├── (main)/      # Main layout with nav
│   │   │   │   ├── (protected)/  # Auth-required routes
│   │   │   │   └── publico/      # Public landing
│   │   │   └── auth/confirm/     # Email confirmation
│   │   ├── components/
│   │   │   ├── crud/        # Generic CRUD components (EntityPage, EntityTable, EntityModal)
│   │   │   ├── ui/          # Shadcn/Radix base components
│   │   │   ├── reports/     # Report components with TanStack Table
│   │   │   └── electron/    # Electron-specific (WindowControls, UpdateNotification)
│   │   ├── hooks/           # React Query hooks (useCrud, useCommunityData, useReports)
│   │   ├── config/          # Entity configs (entities.ts) and domain logic (carisma.ts)
│   │   ├── contexts/        # AuthContext
│   │   ├── types/           # TypeScript type definitions
│   │   ├── lib/             # Helpers (routes.ts, queryKeys.ts)
│   │   └── utils/           # Supabase client setup
│   ├── electron/            # Electron main process + preload
│   ├── public/              # Static assets
│   └── build-resources/     # Electron build icons
├── supabase/
│   └── migrations/          # SQL migration files (timestamped)
├── .github/workflows/       # CI/CD pipelines
└── package.json             # Root workspace scripts
```

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack, static export) |
| UI | React 19, Radix UI Themes 3.2, Tailwind CSS 4, Lucide icons |
| State/Data | TanStack React Query 5, TanStack React Table 8 |
| Backend | Supabase (PostgreSQL, Auth, RLS) |
| Desktop | Electron 40, electron-builder, electron-updater |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS + Shadcn/ui (New York style) |

## Domain Model

The app manages a hierarchical structure of religious communities:

```
Countries → States → Cities → City Zones
                                    ↓
Dioceses → Parishes → Communities → Brothers (People)
                                  → Teams (Catequistas, Responsables)
                                  → Step progression (Etapas)
People ← spouse_id (self-ref for marriages)
       ← carisma (Casado, Soltero, Presbítero, Seminarista, Diácono, Religiosa)
       ← itinerante (boolean, with location tracking)
```

**Key Spanish domain terms:**
- Parroquia = Parish, Comunidad = Community, Hermano = Brother/Member
- Catequista = Catechist, Responsable = Leader, Presbítero = Priest
- Etapa/Paso = Stage/Step, Diócesis = Diocese, Zona = Zone
- Carisma = Charism (person type/vocation)

## Coding Conventions

### TypeScript / React

- Use TypeScript strict mode. All new code must be fully typed.
- Use `@/*` path alias for imports (maps to `./src/*`).
- Prefer named exports for components and hooks.
- Use React 19 features where appropriate.
- Components use `.tsx`, pure logic files use `.ts`.

### Component Patterns

- **Generic CRUD**: Use `EntityPage`, `EntityTable`, `EntityModal` for standard entity management. New entities should follow the `EntityConfig<T>` pattern in `/src/config/entities.ts`.
- **Detail Pages**: For complex entities (Community, Parish), create dedicated detail pages with info sections, related lists, and team management.
- **Modals**: Use Radix Dialog for all modals. Selection modals follow the `Select*Modal` pattern.
- **Print Views**: Support `print:hidden` / `print:block` classes for printable sections.

### Data Layer

- **Supabase Client**: Use the singleton from `@/utils/supabase/client.ts`. Never instantiate `createClient()` directly in components.
- **React Query**: All data fetching through TanStack React Query hooks.
  - `staleTime: 60_000`, `gcTime: 300_000` defaults
  - Query keys via `queryKeys` from `@/lib/queryKeys.ts`
  - Mutations must invalidate relevant queries on success
- **useCrud hook**: For standard CRUD operations with search, sort, pagination, and foreign key joins.
- **Error handling**: Map Supabase error codes (23505, 23503, etc.) to user-friendly Spanish messages.

### Supabase / Database

- Migrations go in `supabase/migrations/` with timestamp prefix: `YYYYMMDDHHMMSS_description.sql`
- Always include RLS policies for new tables.
- Use `ON DELETE CASCADE` or `SET NULL` as appropriate for foreign keys.
- Add unique constraints to prevent duplicate data.
- Test migrations locally with `npx supabase db reset` before pushing.

### Electron

- IPC handlers in `electron/main.ts`, preload scripts in `electron/preload.ts`.
- Never expose Node.js APIs directly to renderer. Use `contextBridge`.
- Auto-update logic uses `electron-updater` with GitHub releases.
- The app uses `output: 'export'` (static) for Electron compatibility.

### Styling

- Tailwind CSS 4 with Radix UI Themes for layout consistency.
- Shadcn/ui components configured in `components.json` (New York style, Lucide icons).
- Use `cn()` helper from `@/lib/utils` for conditional class merging.
- Responsive: `grid-cols-1 lg:grid-cols-2` patterns for detail pages.
- Print-friendly: use `print:` variants for print layouts.

### UI Language

The entire UI is in **Spanish**. All labels, messages, placeholders, and error messages must be in Spanish. Variable names and code comments remain in English.

## Development Commands

```bash
# From root (monorepo)
npm run dev:full          # Start Supabase + Next.js + open Chrome
npm run dev:supabase      # Start only Supabase local
npm run dev:react         # Start only Next.js dev server
npm run stop              # Stop Supabase

# From /caminomanager
npm run dev               # Next.js dev with Turbopack
npm run build             # Production build (static export)
npm run lint              # ESLint
npm run type-check        # TypeScript checking (tsc --noEmit)
npm run electron:dev      # Build + run Electron dev
npm run electron:build    # Production Electron installer (Windows)
```

## CI/CD

- **ci.yml**: Quality, coverage, build, database and smoke checks on PRs/pushes to dev and main.
- **Vercel Git integration**: Automatic previews for PR branches and dev; main is deployed manually from Vercel. See docs/deployment.md.
- **electron-release.yml**: Build and publish Electron releases
- **supabase-migrations.yml**: Integration after successful dev CI; production requires manual dispatch on main.
- **security.yml**: CodeQL security scanning

## Testing

- Use **Vitest** and **React Testing Library**; import production code rather than copying its logic into tests.
- Place tests next to source files as `*.test.ts(x)` or in `__tests__/` directories. Use real QueryClient instances and mock only external boundaries for hook tests.
- Run `npm run test:coverage` from the root. Keep the broad application baseline and the stronger critical-module thresholds in `caminomanager/vitest.config.ts`.
- Database integration contracts live in `supabase/tests/database/*.test.sql`; run `npm run test:integration` against local Supabase. Use transactional fixtures and ROLLBACK; never target production.
- Playwright smoke: `npm run test:e2e:smoke`; seeded web regression: `npm run test:e2e:regression`. Electron uses `npm run test:electron` from `caminomanager`.
- See `docs/testing.md` for prerequisites, coverage scope, the automation matrix, and known gaps.

## Git Workflow

- Default/integration branch: `dev`; production branch: `main`
- Feature branches: `feature/description` or `fix/description`
- Commit messages in English, imperative mood.
- PRs require CI checks to pass before merge.

## Security

- Never commit `.env` or `.env.local` files. Use `env.cloud.local` as template.
- Supabase keys (anon, service_role) must stay in environment variables.
- RLS policies enforce data-level security. All tables must have RLS enabled.
- Auth flows use Supabase Auth with email confirmation.
