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
- Both environments: `SUPABASE_ACCESS_TOKEN`, a personal access token with access
  to the corresponding projects. The CLI expects a token starting with `sbp_`;
  project publishable or secret API keys do not replace this token.

Production migrations run automatically only when a push to `main` changes
`supabase/migrations/**`. Workflow and documentation changes alone do not deploy.
Manual runs from `main` select an environment and default to a dry run; applying
requires explicitly selecting `apply`.

Before merging, add `check-migrations` to a matching same-repository pull request
to compare local/remote history and preview pending SQL in both environments.
This label never applies migrations. `run-migrations` applies to integration only,
and only when `check-migrations` is absent. Remove/re-add the appropriate label to
rerun after updating secrets. Neither label is present on PR #172 during preparation.

All remote jobs validate credentials, link using the environment's database
password, list migration history and run `db push --dry-run --skip-vault` before
any explicit apply. CLI 2.122.0 and Node.js 22 are pinned; operations for the same
environment are serialized without cancelling an active migration. Credential
tests run without secrets on every matching PR. Format validation does not verify
remote access, passwords, or that a syntactically valid project ID is the intended
destination.

See [the token replacement and migration review guide](docs/supabase-deployment.md)
for the pre-merge procedure and the four candidate migrations identified from CI.

## License

All rights reserved.
