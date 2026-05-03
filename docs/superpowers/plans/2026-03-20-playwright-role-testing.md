# Playwright Role-Based UI Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Playwright E2E test suite that validates role-based UI visibility, takes screenshots of the home page for each role, and generates an HTML report comparing what each user type sees.

**Architecture:** Playwright tests authenticate as pre-seeded users (one per role variant) against a running Supabase + Next.js dev instance. Each test logs in, navigates the home and key pages, takes screenshots, and asserts visibility of UI elements per role. A report generator aggregates screenshots into a browsable HTML gallery.

**Tech Stack:** Playwright Test, TypeScript, HTML reporter (built-in + custom screenshot gallery)

---

## File Structure

```
caminomanager/
├── playwright.config.ts                      # Playwright configuration
├── e2e/
│   ├── fixtures/
│   │   ├── auth.fixture.ts                   # Auth fixture: login helper per role
│   │   └── test-users.ts                     # Test user credentials per role
│   ├── helpers/
│   │   └── screenshots.ts                    # Screenshot naming + gallery helpers
│   ├── roles/
│   │   ├── home-visibility.spec.ts           # Home page cards visible per role
│   │   ├── sidebar-visibility.spec.ts        # Sidebar items visible per role
│   │   ├── route-access.spec.ts              # Direct URL access allowed/blocked per role
│   │   └── admin-panel.spec.ts               # Admin panel access (admin vs others)
│   ├── screenshots/
│   │   └── (auto-generated screenshots land here)
│   └── reports/
│       └── role-gallery.spec.ts              # Generates the screenshot comparison report
├── scripts/
│   └── seed-test-users.ts                    # Node.js script to seed test users via Supabase Admin API
```

## Pre-requisites

- A running Supabase local instance (`npx supabase start`)
- The Next.js dev server running (`npm run dev`)
- Test users seeded in the database (one per role variant, 9 total)

---

### Task 1: Install Playwright and create config

**Files:**
- Modify: `caminomanager/package.json`
- Create: `caminomanager/playwright.config.ts`

- [ ] **Step 1: Install Playwright as dev dependency**

```bash
cd caminomanager && npm install -D @playwright/test
```

- [ ] **Step 2: Install browser binaries**

```bash
cd caminomanager && npx playwright install chromium
```

- [ ] **Step 3: Create playwright.config.ts**

```typescript
// caminomanager/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',
  fullyParallel: false, // each test logs in fresh; sequential avoids overwhelming the dev server
  workers: 1,
  retries: 0,
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'off', // we take manual screenshots
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],
  reporter: [
    ['html', { outputFolder: './e2e/playwright-report', open: 'never' }],
    ['list'],
  ],
});
```

- [ ] **Step 4: Add scripts to package.json**

Add these to `scripts` in `package.json`:

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:report": "playwright show-report e2e/playwright-report",
"seed:e2e": "npx tsx scripts/seed-test-users.ts"
```

- [ ] **Step 5: Add e2e output dirs to .gitignore**

Append to `caminomanager/.gitignore`:

```
# Playwright
e2e/test-results/
e2e/playwright-report/
e2e/screenshots/
```

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts package.json package-lock.json .gitignore
git commit -m "feat: add Playwright config for E2E role testing"
```

---

### Task 2: Seed test users script (Node.js + Supabase Admin API)

**Files:**
- Create: `caminomanager/scripts/seed-test-users.ts`

Uses `supabase.auth.admin.createUser()` to properly create users with auth identities, avoiding the `auth.identities` table issues that raw SQL inserts cause.

- [ ] **Step 1: Install tsx for running TypeScript scripts**

```bash
cd caminomanager && npm install -D tsx
```

- [ ] **Step 2: Create the seed script**

```typescript
// caminomanager/scripts/seed-test-users.ts
// Seeds one test user per role variant for E2E testing.
// Run: npx tsx scripts/seed-test-users.ts
// Requires: local Supabase running (npx supabase start)

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
// Service role key from `npx supabase status`
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required. Get it from: npx supabase status');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = 'TestPass123!';

// IMPORTANT: Adjust these IDs to match your local seed data
const TEST_ZONE_ID = 1;
const TEST_COMMUNITY_ID = 1;

interface TestUserDef {
  email: string;
  fullName: string;
  username: string;
  role: string;
  zone_id?: number;
  community_id?: number;
  grantCommunityAccess?: boolean; // for viewer_grants
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

  // Clean up previous test users
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const e2eUsers = existingUsers?.users.filter((u) => u.email?.startsWith('e2e-')) || [];
  for (const user of e2eUsers) {
    await supabase.auth.admin.deleteUser(user.id);
    console.log(`  Deleted existing: ${user.email}`);
  }

  for (const def of TEST_USERS) {
    // Create auth user via Admin API (handles auth.identities automatically)
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

    // Update profile with role and scope
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

    // Grant community access for viewer_grants variant
    if (def.grantCommunityAccess) {
      const { error: grantError } = await supabase.rpc('grant_community_access', {
        p_user_id: userId,
        p_community_id: TEST_COMMUNITY_ID,
      });
      if (grantError) {
        // If RPC fails, try direct insert
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
```

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-test-users.ts
git commit -m "feat: add Node.js seed script for E2E test users via Supabase Admin API"
```

---

### Task 3: Test user config and auth fixture

**Files:**
- Create: `caminomanager/e2e/fixtures/test-users.ts`
- Create: `caminomanager/e2e/fixtures/auth.fixture.ts`

- [ ] **Step 1: Create test-users.ts with credentials per role**

```typescript
// caminomanager/e2e/fixtures/test-users.ts

export interface TestUser {
  email: string;
  password: string;
  role: string;
  label: string;
  /** User is redirected away from home to community detail */
  expectRedirect?: boolean;
}

const PASSWORD = 'TestPass123!';

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    email: 'e2e-admin@test.local',
    password: PASSWORD,
    role: 'admin',
    label: 'Administrador',
  },
  contributor: {
    email: 'e2e-contributor@test.local',
    password: PASSWORD,
    role: 'contributor',
    label: 'Contribuidor',
  },
  zone_leader: {
    email: 'e2e-zoneleader@test.local',
    password: PASSWORD,
    role: 'zone_leader',
    label: 'Jefe de Zona',
  },
  zone_contributor: {
    email: 'e2e-zonecontributor@test.local',
    password: PASSWORD,
    role: 'zone_contributor',
    label: 'Contribuidor Zona',
  },
  community_responsible: {
    email: 'e2e-communityresp@test.local',
    password: PASSWORD,
    role: 'community_responsible',
    label: 'Responsable de Comunidad',
    expectRedirect: true, // redirects to community detail
  },
  viewer_zone: {
    email: 'e2e-viewer-zone@test.local',
    password: PASSWORD,
    role: 'viewer',
    label: 'Viewer (zona)',
  },
  viewer_community: {
    email: 'e2e-viewer-community@test.local',
    password: PASSWORD,
    role: 'viewer',
    label: 'Viewer (comunidad)',
    expectRedirect: true, // redirects to community detail
  },
  viewer_grants: {
    email: 'e2e-viewer-grants@test.local',
    password: PASSWORD,
    role: 'viewer',
    label: 'Viewer (con grants)',
  },
  viewer_noscope: {
    email: 'e2e-viewer-noscope@test.local',
    password: PASSWORD,
    role: 'viewer',
    label: 'Viewer (sin alcance)',
  },
};

export const ALL_ROLE_KEYS = Object.keys(TEST_USERS);
```

- [ ] **Step 2: Create auth.fixture.ts with login helper**

The login form uses labels "Correo electrónico" and "Contraseña", and the submit button says "Ingresar". The form is wrapped in `<Suspense>` with a loading spinner, so we must wait for the form to appear first.

```typescript
// caminomanager/e2e/fixtures/auth.fixture.ts
import { test as base, type Page } from '@playwright/test';
import { TEST_USERS, type TestUser } from './test-users';

/**
 * Logs into the app via the /login page.
 * Waits for redirect to home or community detail.
 */
async function loginAs(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login');

  // Wait for Suspense + auth check to complete and the form to render
  await page.waitForSelector('form', { timeout: 15_000 });

  await page.getByLabel(/correo/i).fill(user.email);
  await page.getByLabel(/contraseña/i).fill(user.password);
  await page.getByRole('button', { name: /ingresar/i }).click();

  // Wait for navigation away from /login
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 15_000,
  });
}

// Export extended test with loginAs available
export const test = base.extend<{
  loginAs: (roleKey: string) => Promise<TestUser>;
}>({
  loginAs: async ({ page }, use) => {
    await use(async (roleKey: string) => {
      const user = TEST_USERS[roleKey];
      if (!user) throw new Error(`Unknown role key: ${roleKey}`);
      await loginAs(page, user);
      return user;
    });
  },
});

export { expect } from '@playwright/test';
```

- [ ] **Step 3: Commit**

```bash
git add e2e/fixtures/
git commit -m "feat: add test user config and Playwright auth fixture"
```

---

### Task 4: Screenshot helper utility

**Files:**
- Create: `caminomanager/e2e/helpers/screenshots.ts`

Uses `--` as separator between role and page name to avoid parsing ambiguity with underscore-containing role keys like `zone_leader` or `viewer_noscope`.

- [ ] **Step 1: Create screenshot helper**

```typescript
// caminomanager/e2e/helpers/screenshots.ts
import { type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');

/**
 * Takes a full-page screenshot with a standardized name.
 * Format: {role}--{page}_{viewport}.png
 * The '--' separator allows correct parsing even when role keys contain underscores.
 */
export async function takeRoleScreenshot(
  page: Page,
  role: string,
  pageName: string,
  options?: { fullPage?: boolean }
): Promise<string> {
  const viewport = page.viewportSize();
  const viewportLabel = viewport && viewport.width <= 480 ? 'mobile' : 'desktop';
  const fileName = `${role}--${pageName}_${viewportLabel}.png`;
  const filePath = path.join(SCREENSHOTS_DIR, fileName);

  await page.screenshot({
    path: filePath,
    fullPage: options?.fullPage ?? true,
  });

  return filePath;
}

export { SCREENSHOTS_DIR };
```

- [ ] **Step 2: Commit**

```bash
git add e2e/helpers/
git commit -m "feat: add screenshot helper with role--page_viewport naming"
```

---

### Task 5: Home page visibility tests per role

**Files:**
- Create: `caminomanager/e2e/roles/home-visibility.spec.ts`

This is the core test: for each role, log in, check which cards are visible on the home page, take a screenshot.

The expected visibility comes from `getSidebarVisibility()` in `src/lib/permissions.ts`. The home page filters quick access cards using the `comunidades`, `parroquias`, `personas`, and `reportes` keys, and shows secondary section when `organizacion || ubicaciones`.

- [ ] **Step 1: Create the home visibility test file**

```typescript
// caminomanager/e2e/roles/home-visibility.spec.ts
import { test, expect } from '../fixtures/auth.fixture';
import { TEST_USERS, ALL_ROLE_KEYS } from '../fixtures/test-users';
import { takeRoleScreenshot } from '../helpers/screenshots';

// Cards expected on the home page per role key
// Source of truth: getSidebarVisibility() in src/lib/permissions.ts
// Home page uses: comunidades, parroquias, personas, reportes for quick access cards
// Secondary section shown when: organizacion || ubicaciones
const EXPECTED_CARDS: Record<string, {
  visible: string[];
  hidden: string[];
  secondaryVisible: boolean;
}> = {
  admin: {
    visible: ['Comunidades', 'Parroquias', 'Personas', 'Reportes'],
    hidden: [],
    secondaryVisible: true, // organizacion: true, ubicaciones: true
  },
  contributor: {
    visible: ['Comunidades', 'Parroquias', 'Personas', 'Reportes'],
    hidden: [],
    secondaryVisible: true, // organizacion: true, ubicaciones: true
  },
  zone_leader: {
    visible: ['Comunidades', 'Parroquias', 'Personas', 'Reportes'],
    hidden: [],
    secondaryVisible: false, // organizacion: false, ubicaciones: false
  },
  zone_contributor: {
    visible: ['Comunidades', 'Parroquias', 'Personas'],
    hidden: ['Reportes'],
    secondaryVisible: false,
  },
  // community_responsible redirects to community detail — tested in redirect section
  community_responsible: { visible: [], hidden: [], secondaryVisible: false },
  viewer_zone: {
    visible: ['Comunidades', 'Parroquias'],
    hidden: ['Personas', 'Reportes'],
    secondaryVisible: false,
  },
  // viewer_community redirects to community detail — tested in redirect section
  viewer_community: { visible: [], hidden: [], secondaryVisible: false },
  viewer_grants: {
    visible: ['Comunidades'],
    hidden: ['Parroquias', 'Personas', 'Reportes'],
    secondaryVisible: false,
  },
  viewer_noscope: {
    visible: [],
    hidden: ['Comunidades', 'Parroquias', 'Personas', 'Reportes'],
    secondaryVisible: false,
  },
};

// Roles that stay on the home page (don't redirect)
const HOME_ROLES = ALL_ROLE_KEYS.filter(
  (key) => !TEST_USERS[key].expectRedirect
);

// Roles that redirect to community detail
const REDIRECT_ROLES = ALL_ROLE_KEYS.filter(
  (key) => TEST_USERS[key].expectRedirect
);

test.describe('Home page - card visibility per role', () => {
  for (const roleKey of HOME_ROLES) {
    const user = TEST_USERS[roleKey];
    const expected = EXPECTED_CARDS[roleKey];

    test(`${user.label} (${roleKey}): sees correct cards`, async ({ page, loginAs }) => {
      await loginAs(roleKey);

      // Should be on home
      await expect(page).toHaveURL('/');

      // Wait for content to load
      await page.waitForSelector('text=Bienvenido', { timeout: 10_000 });

      // Check visible cards
      for (const cardTitle of expected.visible) {
        await expect(
          page.getByRole('heading', { name: cardTitle }).or(
            page.locator('.grid a').getByText(cardTitle, { exact: true })
          )
        ).toBeVisible();
      }

      // Check hidden cards
      for (const cardTitle of expected.hidden) {
        // Use count check — hidden cards should not be in the DOM at all
        // (they are filtered out by the component, not just hidden via CSS)
        const count = await page.locator('.grid a').getByText(cardTitle, { exact: true }).count();
        expect(count).toBe(0);
      }

      // Check secondary section
      const secondaryHeading = page.getByText('Otras secciones');
      if (expected.secondaryVisible) {
        await expect(secondaryHeading).toBeVisible();
      } else {
        const count = await secondaryHeading.count();
        expect(count).toBe(0);
      }

      // Take screenshot
      await takeRoleScreenshot(page, roleKey, 'home');
    });
  }
});

test.describe('Home page - redirect roles', () => {
  for (const roleKey of REDIRECT_ROLES) {
    const user = TEST_USERS[roleKey];

    test(`${user.label} (${roleKey}): redirects to community detail`, async ({ page, loginAs }) => {
      await loginAs(roleKey);

      // Should redirect to community detail page (client-side redirect)
      await page.waitForURL('**/comunidades/detalle**', { timeout: 15_000 });
      expect(page.url()).toContain('/comunidades/detalle');

      // Take screenshot of where they land
      await takeRoleScreenshot(page, roleKey, 'home-redirect');
    });
  }
});
```

- [ ] **Step 2: Run the test to verify it works (requires dev server + seeded DB)**

```bash
cd caminomanager && npx playwright test e2e/roles/home-visibility.spec.ts --project=chromium-desktop --reporter=list
```

Expected: Tests pass, screenshots saved to `e2e/screenshots/`.

- [ ] **Step 3: Commit**

```bash
git add e2e/roles/home-visibility.spec.ts
git commit -m "feat: add home page visibility tests per role with screenshots"
```

---

### Task 6: Sidebar visibility tests per role

**Files:**
- Create: `caminomanager/e2e/roles/sidebar-visibility.spec.ts`

- [ ] **Step 1: Create sidebar visibility tests**

```typescript
// caminomanager/e2e/roles/sidebar-visibility.spec.ts
import { test, expect } from '../fixtures/auth.fixture';
import { TEST_USERS, ALL_ROLE_KEYS } from '../fixtures/test-users';
import { takeRoleScreenshot } from '../helpers/screenshots';

// Sidebar items expected per role (based on getSidebarVisibility in permissions.ts)
// The sidebar uses SidebarMenuButton with text labels inside <span> elements
const SIDEBAR_ITEMS: Record<string, {
  visible: string[];
  hidden: string[];
}> = {
  admin: {
    visible: ['Inicio', 'Comunidades', 'Parroquias', 'Personas', 'Reportes', 'Admin'],
    hidden: [],
  },
  contributor: {
    visible: ['Inicio', 'Comunidades', 'Parroquias', 'Personas', 'Reportes'],
    hidden: ['Admin'],
  },
  zone_leader: {
    visible: ['Inicio', 'Comunidades', 'Parroquias', 'Personas', 'Reportes'],
    hidden: ['Admin'],
  },
  zone_contributor: {
    visible: ['Inicio', 'Comunidades', 'Parroquias', 'Personas'],
    hidden: ['Reportes', 'Admin'],
  },
  community_responsible: {
    visible: ['Inicio', 'Comunidades'],
    hidden: ['Parroquias', 'Personas', 'Reportes', 'Admin'],
  },
  viewer_zone: {
    visible: ['Inicio', 'Comunidades', 'Parroquias'],
    hidden: ['Personas', 'Reportes', 'Admin'],
  },
  viewer_community: {
    visible: ['Inicio', 'Comunidades'],
    hidden: ['Parroquias', 'Personas', 'Reportes', 'Admin'],
  },
  viewer_grants: {
    visible: ['Inicio', 'Comunidades'],
    hidden: ['Parroquias', 'Personas', 'Reportes', 'Admin'],
  },
  viewer_noscope: {
    visible: ['Inicio'],
    hidden: ['Comunidades', 'Parroquias', 'Personas', 'Reportes', 'Admin'],
  },
};

test.describe('Sidebar - item visibility per role', () => {
  for (const roleKey of ALL_ROLE_KEYS) {
    const user = TEST_USERS[roleKey];
    const expected = SIDEBAR_ITEMS[roleKey];

    test(`${user.label} (${roleKey}): sidebar shows correct items`, async ({ page, loginAs }) => {
      await loginAs(roleKey);

      // Wait for app to load
      await page.waitForLoadState('networkidle');

      // On mobile, open the sidebar drawer if it exists
      const viewport = page.viewportSize();
      if (viewport && viewport.width < 768) {
        const menuButton = page.getByRole('button', { name: /menu/i });
        if (await menuButton.isVisible()) {
          await menuButton.click();
          await page.waitForTimeout(500);
        }
      }

      // Scope to the sidebar element using data-sidebar attribute
      const sidebar = page.locator('[data-sidebar="sidebar"]');

      // Check visible items
      for (const item of expected.visible) {
        await expect(
          sidebar.getByText(item, { exact: true }).first()
        ).toBeVisible({ timeout: 5_000 });
      }

      // Check hidden items (consistent: exact: true for both visible and hidden)
      for (const item of expected.hidden) {
        const count = await sidebar.getByText(item, { exact: true }).count();
        expect(count, `"${item}" should not appear in sidebar for ${roleKey}`).toBe(0);
      }

      // Take screenshot showing sidebar
      await takeRoleScreenshot(page, roleKey, 'sidebar');
    });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/roles/sidebar-visibility.spec.ts
git commit -m "feat: add sidebar visibility tests per role"
```

---

### Task 7: Route access tests per role

**Files:**
- Create: `caminomanager/e2e/roles/route-access.spec.ts`

The protected layout uses `canAccessRoute()` which triggers `router.replace('/')` client-side. Tests must wait for the redirect to complete, not just for `networkidle`.

- [ ] **Step 1: Create route access tests**

```typescript
// caminomanager/e2e/roles/route-access.spec.ts
import { test, expect } from '../fixtures/auth.fixture';
import { TEST_USERS } from '../fixtures/test-users';
import { takeRoleScreenshot } from '../helpers/screenshots';

// Routes to test with expected access per role
const ROUTES_TO_TEST = [
  { path: '/comunidades', name: 'comunidades' },
  { path: '/parroquias', name: 'parroquias' },
  { path: '/personas', name: 'personas' },
  { path: '/reportes', name: 'reportes' },
  { path: '/diocesis', name: 'diocesis' },
  { path: '/admin', name: 'admin' },
  { path: '/cuenta', name: 'cuenta' },
];

// Expected access: true = stays on page, false = redirected to home
const ACCESS_MATRIX: Record<string, Record<string, boolean>> = {
  admin: {
    comunidades: true, parroquias: true, personas: true,
    reportes: true, diocesis: true, admin: true, cuenta: true,
  },
  contributor: {
    comunidades: true, parroquias: true, personas: true,
    reportes: true, diocesis: true, admin: false, cuenta: true,
  },
  zone_leader: {
    comunidades: true, parroquias: true, personas: true,
    reportes: true, diocesis: false, admin: false, cuenta: true,
  },
  zone_contributor: {
    comunidades: true, parroquias: true, personas: true,
    reportes: false, diocesis: false, admin: false, cuenta: true,
  },
  community_responsible: {
    comunidades: true, parroquias: false, personas: false,
    reportes: false, diocesis: false, admin: false, cuenta: true,
  },
  viewer_zone: {
    comunidades: true, parroquias: true, personas: false,
    reportes: false, diocesis: false, admin: false, cuenta: true,
  },
  viewer_community: {
    comunidades: true, parroquias: false, personas: false,
    reportes: false, diocesis: false, admin: false, cuenta: true,
  },
  viewer_grants: {
    comunidades: true, parroquias: false, personas: false,
    reportes: false, diocesis: false, admin: false, cuenta: true,
  },
  viewer_noscope: {
    comunidades: false, parroquias: false, personas: false,
    reportes: false, diocesis: false, admin: false, cuenta: true,
  },
};

// Test a subset of critical roles to keep test time manageable
const ROLES_TO_TEST = ['admin', 'zone_leader', 'community_responsible', 'viewer_grants', 'viewer_noscope'];

test.describe('Route access control per role', () => {
  for (const roleKey of ROLES_TO_TEST) {
    const user = TEST_USERS[roleKey];
    const accessMap = ACCESS_MATRIX[roleKey];

    test.describe(`${user.label} (${roleKey})`, () => {
      for (const route of ROUTES_TO_TEST) {
        const shouldAccess = accessMap[route.name];

        test(`${shouldAccess ? 'CAN' : 'CANNOT'} access ${route.path}`, async ({ page, loginAs }) => {
          await loginAs(roleKey);
          await page.goto(route.path);

          if (shouldAccess) {
            // Should stay on the route — wait for content to load
            await page.waitForLoadState('networkidle');
            expect(page.url()).toContain(route.path);
          } else {
            // Should be redirected away (client-side redirect via router.replace)
            // Wait explicitly for the URL to change
            await page.waitForURL(
              (url) => !url.pathname.startsWith(route.path),
              { timeout: 10_000 }
            );
            expect(page.url()).not.toContain(route.path);
          }

          // Take screenshot
          await takeRoleScreenshot(page, roleKey, `route-${route.name}`);
        });
      }
    });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/roles/route-access.spec.ts
git commit -m "feat: add route access control tests per role"
```

---

### Task 8: Admin panel access test

**Files:**
- Create: `caminomanager/e2e/roles/admin-panel.spec.ts`

- [ ] **Step 1: Create admin panel test**

```typescript
// caminomanager/e2e/roles/admin-panel.spec.ts
import { test, expect } from '../fixtures/auth.fixture';
import { takeRoleScreenshot } from '../helpers/screenshots';

test.describe('Admin panel access', () => {
  test('admin can see user management', async ({ page, loginAs }) => {
    await loginAs('admin');
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Should see user list
    await expect(page.getByText(/usuarios|gestión/i).first()).toBeVisible();

    // Take screenshot
    await takeRoleScreenshot(page, 'admin', 'admin-panel');
  });

  test('contributor cannot access admin panel', async ({ page, loginAs }) => {
    await loginAs('contributor');
    await page.goto('/admin');

    // Should be redirected to home (client-side redirect)
    await page.waitForURL((url) => !url.pathname.startsWith('/admin'), { timeout: 10_000 });
    expect(page.url()).not.toContain('/admin');
    await takeRoleScreenshot(page, 'contributor', 'admin-blocked');
  });

  test('viewer cannot access admin panel', async ({ page, loginAs }) => {
    await loginAs('viewer_noscope');
    await page.goto('/admin');

    // Should be redirected
    await page.waitForURL((url) => !url.pathname.startsWith('/admin'), { timeout: 10_000 });
    expect(page.url()).not.toContain('/admin');
    await takeRoleScreenshot(page, 'viewer_noscope', 'admin-blocked');
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/roles/admin-panel.spec.ts
git commit -m "feat: add admin panel access tests"
```

---

### Task 9: Screenshot comparison report generator

**Files:**
- Create: `caminomanager/e2e/reports/role-gallery.spec.ts`

This test runs last and generates an HTML gallery page comparing all screenshots side by side, organized by page and role. Uses `--` separator to correctly parse role keys that contain underscores.

- [ ] **Step 1: Create the gallery report generator**

```typescript
// caminomanager/e2e/reports/role-gallery.spec.ts
import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const REPORT_PATH = path.join(SCREENSHOTS_DIR, 'role-report.html');

test('Generate role screenshot comparison report', async () => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const files = fs.readdirSync(SCREENSHOTS_DIR).filter((f) => f.endsWith('.png'));

  if (files.length === 0) {
    console.log('No screenshots found. Run the role tests first.');
    return;
  }

  // Parse filenames: {role}--{page}_{viewport}.png
  interface ScreenshotInfo {
    role: string;
    page: string;
    viewport: string;
    filename: string;
  }

  const screenshots: ScreenshotInfo[] = files.map((f) => {
    const nameWithoutExt = f.replace('.png', '');
    // Split on '--' to separate role from page_viewport
    const [role, rest] = nameWithoutExt.split('--');
    const lastUnderscore = rest.lastIndexOf('_');
    const page = rest.substring(0, lastUnderscore);
    const viewport = rest.substring(lastUnderscore + 1);
    return { role, page, viewport, filename: f };
  });

  // Group by page + viewport
  const byPage = new Map<string, ScreenshotInfo[]>();
  for (const s of screenshots) {
    const key = `${s.page} (${s.viewport})`;
    if (!byPage.has(key)) byPage.set(key, []);
    byPage.get(key)!.push(s);
  }

  // Sort roles in a logical order
  const roleOrder = [
    'admin', 'contributor', 'zone_leader', 'zone_contributor',
    'community_responsible', 'viewer_zone', 'viewer_community',
    'viewer_grants', 'viewer_noscope',
  ];

  const sortByRole = (a: ScreenshotInfo, b: ScreenshotInfo) =>
    roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);

  // Role display labels
  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    contributor: 'Contribuidor',
    zone_leader: 'Jefe de Zona',
    zone_contributor: 'Contribuidor Zona',
    community_responsible: 'Resp. Comunidad',
    viewer_zone: 'Viewer (zona)',
    viewer_community: 'Viewer (comunidad)',
    viewer_grants: 'Viewer (grants)',
    viewer_noscope: 'Viewer (sin alcance)',
  };

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Role Screenshot Report - VibeCaminoManager</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 2rem; }
    h1 { color: #1B3A6F; margin-bottom: 0.5rem; }
    .subtitle { color: #666; margin-bottom: 2rem; }
    .page-section { background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .page-section h2 { color: #333; margin-bottom: 1rem; border-bottom: 2px solid #1B3A6F; padding-bottom: 0.5rem; }
    .screenshots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 1.5rem; }
    .screenshot-card { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
    .screenshot-card .role-label {
      background: #1B3A6F; color: white; padding: 0.5rem 1rem;
      font-weight: 600; font-size: 0.9rem;
    }
    .screenshot-card img { width: 100%; height: auto; display: block; cursor: pointer; }
    .screenshot-card img:hover { opacity: 0.9; }
    .timestamp { color: #999; font-size: 0.8rem; margin-top: 1rem; }
    .lightbox { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.9); z-index: 1000; justify-content: center; align-items: center; cursor: pointer; }
    .lightbox.active { display: flex; }
    .lightbox img { max-width: 95%; max-height: 95%; object-fit: contain; }
  </style>
</head>
<body>
  <h1>Role Screenshot Report</h1>
  <p class="subtitle">Visual comparison of VibeCaminoManager UI per user role. Click any image to enlarge.</p>

  ${Array.from(byPage.entries())
    .map(([pageKey, shots]) => {
      const sorted = shots.sort(sortByRole);
      return `
  <div class="page-section">
    <h2>${pageKey.toUpperCase()}</h2>
    <div class="screenshots-grid">
      ${sorted
        .map(
          (s) => `
      <div class="screenshot-card">
        <div class="role-label">${roleLabels[s.role] || s.role}</div>
        <img src="${s.filename}" alt="${s.role} - ${s.page}" onclick="openLightbox(this.src)" loading="lazy" />
      </div>`
        )
        .join('')}
    </div>
  </div>`;
    })
    .join('')}

  <p class="timestamp">Generated: ${new Date().toISOString()}</p>

  <div class="lightbox" id="lightbox" onclick="closeLightbox()">
    <img id="lightbox-img" src="" alt="Enlarged screenshot" />
  </div>

  <script>
    function openLightbox(src) {
      document.getElementById('lightbox-img').src = src;
      document.getElementById('lightbox').classList.add('active');
    }
    function closeLightbox() {
      document.getElementById('lightbox').classList.remove('active');
    }
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
  </script>
</body>
</html>`;

  fs.writeFileSync(REPORT_PATH, html, 'utf-8');
  console.log(`Report generated: ${REPORT_PATH}`);
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/reports/
git commit -m "feat: add HTML screenshot gallery report generator"
```

---

### Task 10: End-to-end run and verification

- [ ] **Step 1: Ensure Supabase is running and seeded**

```bash
cd .. && npx supabase start
# Get the service role key from the output above, then:
cd caminomanager && SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/seed-test-users.ts
```

- [ ] **Step 2: Start the dev server**

```bash
cd caminomanager && npm run dev
```

- [ ] **Step 3: Run all E2E tests (desktop project only for first run)**

```bash
cd caminomanager && npx playwright test --project=chromium-desktop --reporter=list
```

Expected: All tests pass. Screenshots saved to `e2e/screenshots/`.

- [ ] **Step 4: Open the HTML report**

```bash
# Playwright built-in report
cd caminomanager && npx playwright show-report e2e/playwright-report

# Custom screenshot gallery
start e2e/screenshots/role-report.html
```

- [ ] **Step 5: Review screenshots visually**

Open `e2e/screenshots/role-report.html` in a browser and verify:
- **Admin**: sees all 4 cards + secondary section + admin sidebar item
- **Contributor**: sees all 4 cards + secondary section, no admin
- **Zone leader**: sees all 4 cards, no secondary section, has reports in sidebar
- **Zone contributor**: sees 3 cards (no Reportes), no secondary
- **Community responsible**: redirects to community detail
- **Viewer (zona)**: sees Comunidades + Parroquias only
- **Viewer (comunidad)**: redirects to community detail
- **Viewer (grants)**: sees Comunidades only
- **Viewer (sin alcance)**: sees only "Inicio", no cards at all

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete Playwright role-based E2E testing suite with screenshot reports"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Playwright install + config | `playwright.config.ts`, `package.json` |
| 2 | Seed test users (Node.js + Admin API) | `scripts/seed-test-users.ts` |
| 3 | Test users config + auth fixture | `e2e/fixtures/*` |
| 4 | Screenshot helper | `e2e/helpers/screenshots.ts` |
| 5 | Home page visibility tests | `e2e/roles/home-visibility.spec.ts` |
| 6 | Sidebar visibility tests | `e2e/roles/sidebar-visibility.spec.ts` |
| 7 | Route access tests | `e2e/roles/route-access.spec.ts` |
| 8 | Admin panel tests | `e2e/roles/admin-panel.spec.ts` |
| 9 | Screenshot gallery report | `e2e/reports/role-gallery.spec.ts` |
| 10 | End-to-end verification | Run + review |

**Test users:** 9 (one per role variant, including 4 viewer sub-variants)
**Total test scenarios:** ~50+ (9 roles x 5 test dimensions)
**Output:** Screenshots per role + HTML comparison gallery + Playwright HTML report
