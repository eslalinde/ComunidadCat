# CaminoManager

A web application for managing Neocatechumenal Way communities, coordinating parishes, people, and catechist teams across cities and regions.

## Features

- **Community management** - Create and manage communities with members, responsible teams, and catechist teams
- **People directory** - Full CRUD for people with support for marriages, vocations, and roles
- **Parish management** - Manage parishes, priests, and diocese information
- **Geographic hierarchy** - Countries, states, and cities management
- **Reports** - Custom reports and community data sheets
- **Authentication & authorization** - Email-based auth with role-based access control
- **Admin panel** - User management and administrative tools


## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS, Radix UI (shadcn/ui)
- **Data**: TanStack React Query, TanStack React Table
- **Backend**: Supabase (PostgreSQL, Auth, Row-Level Security)
- **Unit test**: Unit test for the front-end

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for local Supabase)

### Setup

1. Clone the repository and install dependencies:

   ```bash
   npm install
   cd caminomanager && npm install
   ```

2. Start the local Supabase instance:

   ```bash
   cd supabase
   npx supabase start
   ```

3. Copy the environment variables from the Supabase output into `caminomanager/.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=<your-local-supabase-url>
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<your-local-publishable-key>
   ```

4. Start the development server:

   ```bash
   cd caminomanager
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Supabase deployment configuration

The Electron cloud build reads GitHub secrets `SUPABASE_URL` and
`SUPABASE_PUBLISHABLE_DEFAULT_KEY`. Next.js consumes them as
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.
Keep the cloud URL, publishable key, and migration project ID aligned with the
intended Supabase project. Confirm the destination before changing `env.cloud.local`.

The migration workflow requires these GitHub Actions secrets:

- Production: `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD`.
- Integration: `INTEGRATION_SUPABASE_PROJECT_ID`, `INTEGRATION_SUPABASE_DB_PASSWORD`.
- Production token: `PRODUCTION_SUPABASE_ACCESS_TOKEN`.
- Integration token: `INTEGRATION_SUPABASE_ACCESS_TOKEN`.

Create separate personal access tokens scoped to their corresponding project.
Both write jobs and read-only checks select only that environment's token and map
it to the CLI variable `SUPABASE_ACCESS_TOKEN`. There is no fallback to the old
shared GitHub secret of that name. Missing environment tokens fail validation.
The CLI expects a token starting with `sbp_`; project publishable or secret API
keys do not replace it. Configure the two named repository secrets for preflight;
if a protected GitHub environment overrides either name, keep its value aligned.

Integration migrations run only after a successful push CI run on `dev`, using
that exact commit. Production migrations require a manual run from `main` and
explicitly selecting `confirm_production`; an unchecked manual run only previews.
Write jobs retain the protected `integration` and `production` environments.

Before merging, add `check-migrations` to a matching same-repository pull request
to compare local/remote history and preview pending SQL in both environments.
This inspection uses repository credentials without creating a deployment and
never applies migrations. `run-migrations` no longer authorizes PR writes.
Remove/re-add `check-migrations` to rerun after updating secrets.

All remote jobs validate credentials, link using the environment's database
password, list migration history and run `db push --dry-run --skip-vault` before
any explicit apply. CLI 2.122.0 and Node.js 22 are pinned; operations for the same
environment are serialized without cancelling an active migration. Credential
tests run without secrets on every matching PR. Each configured project ID must
match the confirmed target: production `fkezcibdjgbqyraxnmha`, integration
`azfhawxpdrgrhnpgcwxa`. Format/target validation does not verify remote access or
passwords; migration history must be inspected independently for each new project.

See [the token replacement and migration review guide](docs/supabase-deployment.md)
for the pre-merge procedure and the latest remote migration findings.

## License

All rights reserved.

## Entornos y entregas

Consulte [la guía de CI/CD](docs/deployment.md): PR a dev, previews automáticos y producción manual desde main en Vercel.
