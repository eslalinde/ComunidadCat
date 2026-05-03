// caminomanager/scripts/seed-test-users.ts
// Seeds one test user per role variant for E2E testing.
// Connects directly to PostgreSQL to create auth users (bypasses GoTrue JWT issues).
// Run: npm run seed:e2e
// Requires: local Supabase running (supabase start)

import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const PASSWORD = 'TestPass123!';
const TEST_ZONE_ID = 1;
const TEST_COMMUNITY_ID = 1;

interface TestUserDef {
  email: string;
  fullName: string;
  username: string;
  role: string;
  zone_id?: number;
  community_id?: number;
  grantCommunityAccess?: boolean;
}

const TEST_USERS: TestUserDef[] = [
  { email: 'e2e-admin@test.local', fullName: 'E2E Admin', username: 'e2e-admin', role: 'admin' },
  { email: 'e2e-contributor@test.local', fullName: 'E2E Contributor', username: 'e2e-contributor', role: 'contributor' },
  { email: 'e2e-zoneleader@test.local', fullName: 'E2E Zone Leader', username: 'e2e-zoneleader', role: 'zone_leader', zone_id: TEST_ZONE_ID },
  { email: 'e2e-zonecontributor@test.local', fullName: 'E2E Zone Contributor', username: 'e2e-zonecontrib', role: 'zone_contributor', zone_id: TEST_ZONE_ID },
  { email: 'e2e-communityresp@test.local', fullName: 'E2E Community Responsible', username: 'e2e-communityresp', role: 'community_responsible', community_id: TEST_COMMUNITY_ID },
  { email: 'e2e-viewer-zone@test.local', fullName: 'E2E Viewer Zone', username: 'e2e-viewer-zone', role: 'viewer', zone_id: TEST_ZONE_ID },
  { email: 'e2e-viewer-community@test.local', fullName: 'E2E Viewer Community', username: 'e2e-viewer-community', role: 'viewer', community_id: TEST_COMMUNITY_ID },
  { email: 'e2e-viewer-grants@test.local', fullName: 'E2E Viewer Grants', username: 'e2e-viewer-grants', role: 'viewer', grantCommunityAccess: true },
  { email: 'e2e-viewer-noscope@test.local', fullName: 'E2E Viewer NoScope', username: 'e2e-viewer-noscope', role: 'viewer' },
];

async function seedUsers() {
  const pool = new pg.Pool({ connectionString: DB_URL });

  // Supabase client for profile updates (PostgREST accepts sb_secret or anon key)
  const supabase = createClient(SUPABASE_URL, ANON_KEY);

  console.log('Seeding E2E test users...\n');

  try {
    // Clean up previous test users
    const { rows: existing } = await pool.query(
      "SELECT id, email FROM auth.users WHERE email LIKE 'e2e-%@test.local'"
    );
    for (const user of existing) {
      // Delete profile first (FK), then identities, then user
      await pool.query('DELETE FROM public.profiles WHERE id = $1', [user.id]);
      await pool.query('DELETE FROM auth.identities WHERE user_id = $1', [user.id]);
      await pool.query('DELETE FROM auth.users WHERE id = $1', [user.id]);
      console.log(`  Deleted existing: ${user.email}`);
    }

    for (const def of TEST_USERS) {
      const userId = crypto.randomUUID();
      const now = new Date().toISOString();

      // Insert auth.users with bcrypt password
      // GoTrue requires certain string columns to be '' not NULL
      await pool.query(`
        INSERT INTO auth.users (
          id, instance_id, email, encrypted_password, email_confirmed_at,
          role, aud, raw_user_meta_data, raw_app_meta_data,
          created_at, updated_at,
          confirmation_token, recovery_token,
          email_change, email_change_token_new, email_change_token_current,
          phone, phone_change, phone_change_token,
          is_sso_user, is_anonymous
        ) VALUES (
          $1::uuid, '00000000-0000-0000-0000-000000000000', $2::text,
          crypt($3::text, gen_salt('bf')), $4::timestamptz,
          'authenticated', 'authenticated',
          $5::jsonb, '{"provider":"email","providers":["email"]}'::jsonb,
          $4::timestamptz, $4::timestamptz,
          '', '',
          '', '', '',
          NULL, '', '',
          false, false
        )
      `, [userId, def.email, PASSWORD, now, JSON.stringify({ full_name: def.fullName })]);

      // Insert auth.identities (required for GoTrue to recognize the user)
      await pool.query(`
        INSERT INTO auth.identities (
          id, user_id, identity_data, provider, provider_id,
          last_sign_in_at, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1::uuid,
          jsonb_build_object('sub', $1::text, 'email', $2::text, 'email_verified', true, 'phone_verified', false),
          'email', $2::text, $3::timestamptz, $3::timestamptz, $3::timestamptz
        )
      `, [userId, def.email, now]);

      // Update profile with role and scope (the profiles trigger may auto-create the row)
      // Wait a moment for the trigger to fire
      await new Promise(resolve => setTimeout(resolve, 100));

      const profileFields: string[] = ['full_name = $2', 'username = $3', 'role = $4::app_role'];
      const profileValues: unknown[] = [userId, def.fullName, def.username, def.role];
      let paramIdx = 5;

      if (def.zone_id) {
        profileFields.push(`zone_id = $${paramIdx}`);
        profileValues.push(def.zone_id);
        paramIdx++;
      }
      if (def.community_id) {
        profileFields.push(`community_id = $${paramIdx}`);
        profileValues.push(def.community_id);
        paramIdx++;
      }

      // Try update first (trigger may have created the profile)
      const { rowCount } = await pool.query(
        `UPDATE public.profiles SET ${profileFields.join(', ')} WHERE id = $1`,
        profileValues
      );

      // If no row existed, insert
      if (rowCount === 0) {
        const cols = ['id', 'full_name', 'username', 'role'];
        const vals = [userId, def.fullName, def.username, def.role];
        if (def.zone_id) { cols.push('zone_id'); vals.push(def.zone_id as any); }
        if (def.community_id) { cols.push('community_id'); vals.push(def.community_id as any); }
        const placeholders = vals.map((_, i) => i === 3 ? `$${i + 1}::app_role` : `$${i + 1}`);
        await pool.query(
          `INSERT INTO public.profiles (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`,
          vals
        );
      }

      // Grant community access for viewer_grants variant
      if (def.grantCommunityAccess) {
        await pool.query(
          'INSERT INTO public.user_community_access (user_id, community_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, TEST_COMMUNITY_ID]
        );
        console.log(`  Granted community access to ${def.email}`);
      }

      console.log(`  Created: ${def.email} (${def.role})`);
    }

    console.log('\nDone! All test users use password: TestPass123!');
  } finally {
    await pool.end();
  }
}

seedUsers().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
