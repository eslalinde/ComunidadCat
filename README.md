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
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-local-anon-key>
   ```

4. Start the development server:

   ```bash
   cd caminomanager
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## License

All rights reserved.
