import { test, expect } from '../fixtures/auth.fixture';
import { TEST_USERS, ALL_ROLE_KEYS } from '../fixtures/test-users';
import { takeRoleScreenshot } from '../helpers/screenshots';

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
      await page.waitForLoadState('networkidle');

      const viewport = page.viewportSize();
      if (viewport && viewport.width < 768) {
        const menuButton = page.getByRole('button', { name: /menu/i });
        if (await menuButton.isVisible()) {
          await menuButton.click();
          await page.waitForTimeout(500);
        }
      }

      const sidebar = page.locator('[data-sidebar="sidebar"]');

      for (const item of expected.visible) {
        await expect(
          sidebar.getByText(item, { exact: true }).first()
        ).toBeVisible({ timeout: 5_000 });
      }

      for (const item of expected.hidden) {
        const count = await sidebar.getByText(item, { exact: true }).count();
        expect(count, `"${item}" should not appear in sidebar for ${roleKey}`).toBe(0);
      }

      await takeRoleScreenshot(page, roleKey, 'sidebar');
    });
  }
});
