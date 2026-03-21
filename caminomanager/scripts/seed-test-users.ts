// caminomanager/scripts/seed-test-users.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required. Get it from: npx supabase status');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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
  console.log('Seeding E2E test users...\n');

  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const e2eUsers = existingUsers?.users.filter((u) => u.email?.startsWith('e2e-')) || [];
  for (const user of e2eUsers) {
    await supabase.auth.admin.deleteUser(user.id);
    console.log(`  Deleted existing: ${user.email}`);
  }

  for (const def of TEST_USERS) {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: def.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: def.fullName },
    });

    if (authError) {
      console.error(`  FAILED ${def.email}: ${authError.message}`);
      continue;
    }

    const userId = authData.user.id;

    const profileUpdate: Record<string, unknown> = {
      full_name: def.fullName,
      username: def.username,
      role: def.role,
    };
    if (def.zone_id) profileUpdate.zone_id = def.zone_id;
    if (def.community_id) profileUpdate.community_id = def.community_id;

    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId);

    if (profileError) {
      console.error(`  Profile update FAILED ${def.email}: ${profileError.message}`);
      continue;
    }

    if (def.grantCommunityAccess) {
      const { error: grantError } = await supabase.rpc('grant_community_access', {
        p_user_id: userId,
        p_community_id: TEST_COMMUNITY_ID,
      });
      if (grantError) {
        await supabase.from('user_community_access').insert({
          user_id: userId,
          community_id: TEST_COMMUNITY_ID,
        });
      }
      console.log(`  Granted community access to ${def.email}`);
    }

    console.log(`  Created: ${def.email} (${def.role})`);
  }

  console.log('\nDone! All test users use password: TestPass123!');
}

seedUsers().catch(console.error);
