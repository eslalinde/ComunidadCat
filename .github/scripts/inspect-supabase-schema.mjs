import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Reuse the session pooler discovered by `supabase link`; never log credentials.
const project = process.env.EXPECTED_SUPABASE_PROJECT_ID;
if (!project || project !== process.env.SUPABASE_PROJECT_ID || !process.env.SUPABASE_DB_PASSWORD) {
  throw new Error('Validated project and database credentials are required.');
}
let pooler;
try {
  pooler = new URL(readFileSync('supabase/.temp/pooler-url', 'utf8').trim());
} catch {
  throw new Error('Session pooler unavailable. Check Connection Pooling: Read on the PAT.');
}
if (!['postgres:', 'postgresql:'].includes(pooler.protocol)
    || decodeURIComponent(pooler.username) !== `postgres.${project}`
    || !pooler.hostname.endsWith('.pooler.supabase.com')
    || pooler.port !== '5432'
    || pooler.pathname !== '/postgres') {
  throw new Error('The linked session pooler does not match the expected project.');
}
const result = spawnSync('psql', [
  '-X', '--no-password', '--set=ON_ERROR_STOP=1', '--pset=pager=off',
  '--file=.github/scripts/inspect-supabase-schema.sql',
], {
  stdio: 'inherit',
  env: {
    PATH: process.env.PATH,
    PGHOST: pooler.hostname,
    PGPORT: pooler.port,
    PGUSER: decodeURIComponent(pooler.username),
    PGDATABASE: 'postgres',
    PGPASSWORD: process.env.SUPABASE_DB_PASSWORD,
    PGSSLMODE: 'require',
    PGCONNECT_TIMEOUT: '15',
    PGOPTIONS: '-c default_transaction_read_only=on -c statement_timeout=15000 -c lock_timeout=3000',
  },
});
if (result.error) throw new Error('Unable to start psql for the read-only schema inspection.');
process.exitCode = result.status ?? 1;
