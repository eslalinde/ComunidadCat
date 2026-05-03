import { test, expect } from '../fixtures/auth.fixture';
import { TEST_USERS } from '../fixtures/test-users';
import { takeRoleScreenshot } from '../helpers/screenshots';

const ROUTES_TO_TEST = [
  { path: '/comunidades', name: 'comunidades' },
  { path: '/parroquias', name: 'parroquias' },
  { path: '/personas', name: 'personas' },
  { path: '/reportes', name: 'reportes' },
  { path: '/diocesis', name: 'diocesis' },
  { path: '/admin', name: 'admin' },
  { path: '/cuenta', name: 'cuenta' },
];

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
            await page.waitForLoadState('networkidle');
            expect(page.url()).toContain(route.path);
          } else {
            await page.waitForURL(
              (url) => !url.pathname.startsWith(route.path),
              { timeout: 10_000 }
            );
            expect(page.url()).not.toContain(route.path);
          }

          await takeRoleScreenshot(page, roleKey, `route-${route.name}`, {
            testCaseId: `TC-ROUTE-${roleKey.toUpperCase()}-${route.name.toUpperCase()}-${shouldAccess ? 'OK' : 'BLOCK'}`,
          });
        });
      }
    });
  }
});
