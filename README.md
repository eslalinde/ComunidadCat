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

Production migrations run on matching pushes to `main`, including workflow or
credential-validator changes. The manual workflow also targets production and
only runs from `main`. Integration migrations require a matching pull request
with the `run-migrations` label; adding that label triggers the workflow.
Credential validation checks presence and the token prefix without printing
secret values. A successful check does not verify remote access or passwords.

## License

All rights reserved.
