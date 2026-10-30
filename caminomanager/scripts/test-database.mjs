import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

// Use a separate variable so a developer's production DATABASE_URL is never used.
const connectionString = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const target = new URL(connectionString);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) {
  throw new Error('Las pruebas de integración requieren PostgreSQL local (TEST_DATABASE_URL).');
}

const directory = new URL('../../supabase/tests/database/', import.meta.url);
const files = (await readdir(directory)).filter((file) => file.endsWith('.test.sql')).sort();
if (!files.length) throw new Error('No se encontraron pruebas SQL.');

for (const file of files) {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5_000, statement_timeout: 30_000 });
  try {
    await client.connect();
    const sql = await readFile(new URL(file, directory), 'utf8');
    const results = await client.query(sql);
    const lines = (Array.isArray(results) ? results : [results])
      .flatMap((result) => result.rows)
      .flatMap((row) => Object.values(row))
      .filter((value) => typeof value === 'string')
      .flatMap((value) => value.split('\n'));
    const assertions = lines.filter((line) => /^(not )?ok \d+/.test(line));
    const plan = lines.find((line) => /^1\.\.\d+$/.test(line));
    const expected = plan ? Number(plan.slice(3)) : 0;
    console.log(`\n${fileURLToPath(new URL(file, directory))}`);
    console.log(lines.filter((line) => /^(1\.\.|ok |not ok |#)/.test(line)).join('\n'));
    if (!expected || assertions.length !== expected || assertions.some((line) => line.startsWith('not ok')) || lines.some((line) => /^Bail out!/.test(line))) {
      throw new Error(`Falló el contrato pgTAP: ${assertions.length}/${expected} aserciones ejecutadas.`);
    }
  } finally {
    // SQL files also roll back on success; this covers SQL errors before their final ROLLBACK.
    await client.query('ROLLBACK').catch(() => {});
    await client.end();
  }
}
