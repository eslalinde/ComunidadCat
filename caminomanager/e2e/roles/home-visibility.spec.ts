import { test, expect } from '../fixtures/auth.fixture';
import { TEST_USERS, ALL_ROLE_KEYS } from '../fixtures/test-users';
import { takeRoleScreenshot } from '../helpers/screenshots';

const EXPECTED_CARDS: Record<string, {
  visible: string[];
  hidden: string[];
  secondaryVisible: boolean;
}> = {
  admin: {
    visible: ['Comunidades', 'Parroquias', 'Personas', 'Reportes'],
    hidden: [],
    secondaryVisible: true,
  },
  contributor: {
    visible: ['Comunidades', 'Parroquias', 'Personas', 'Reportes'],
    hidden: [],
    secondaryVisible: true,
  },
  zone_leader: {
    visible: ['Comunidades', 'Parroquias', 'Personas', 'Reportes'],
    hidden: [],
    secondaryVisible: false,
  },
  zone_contributor: {
    visible: ['Comunidades', 'Parroquias', 'Personas'],
    hidden: ['Reportes'],
    secondaryVisible: false,
  },
  community_responsible: { visible: [], hidden: [], secondaryVisible: false },
  viewer_zone: {
    visible: ['Comunidades', 'Parroquias'],
    hidden: ['Personas', 'Reportes'],
    secondaryVisible: false,
  },
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

const HOME_ROLES = ALL_ROLE_KEYS.filter(
  (key) => !TEST_USERS[key].expectRedirect
);

const REDIRECT_ROLES = ALL_ROLE_KEYS.filter(
  (key) => TEST_USERS[key].expectRedirect
);

test.describe('Home page - card visibility per role', () => {
  for (const roleKey of HOME_ROLES) {
    const user = TEST_USERS[roleKey];
    const expected = EXPECTED_CARDS[roleKey];

    test(`${user.label} (${roleKey}): sees correct cards`, async ({ page, loginAs }) => {
      await loginAs(roleKey);

      await expect(page).toHaveURL('/');
      await page.waitForSelector('text=Bienvenido', { timeout: 10_000 });

      for (const cardTitle of expected.visible) {
        await expect(
          page.getByRole('heading', { name: cardTitle }).or(
            page.locator('.grid a').getByText(cardTitle, { exact: true })
          )
        ).toBeVisible();
      }

      for (const cardTitle of expected.hidden) {
        const count = await page.locator('.grid a').getByText(cardTitle, { exact: true }).count();
        expect(count).toBe(0);
      }

      const secondaryHeading = page.getByText('Otras secciones');
      if (expected.secondaryVisible) {
        await expect(secondaryHeading).toBeVisible();
      } else {
        const count = await secondaryHeading.count();
        expect(count).toBe(0);
      }

      await takeRoleScreenshot(page, roleKey, 'home', {
        testCaseId: `TC-HOME-${roleKey.toUpperCase()}`,
      });
    });
  }
});

test.describe('Home page - redirect roles', () => {
  for (const roleKey of REDIRECT_ROLES) {
    const user = TEST_USERS[roleKey];

    test(`${user.label} (${roleKey}): redirects to community detail`, async ({ page, loginAs }) => {
      await loginAs(roleKey);

      await page.waitForURL('**/comunidades/detalle**', { timeout: 15_000 });
      expect(page.url()).toContain('/comunidades/detalle');

      await takeRoleScreenshot(page, roleKey, 'home-redirect', {
        testCaseId: `TC-HOME-${roleKey.toUpperCase()}`,
      });
    });
  }
});
