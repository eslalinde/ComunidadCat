import { test, expect } from '../fixtures/auth.fixture';
import { TEST_USERS, ALL_ROLE_KEYS } from '../fixtures/test-users';
import { takeRoleScreenshot } from '../helpers/screenshots';

const SIDEBAR_ITEMS: Record<string, {
  visible: string[];
  hidden: string[];
}> = {
  admin: {
    visible: ['Inicio', 'Comunidades', 'Parroquias', 'Personas', 'Reportes', 'Administración'],
    hidden: [],
  },
  contributor: {
    visible: ['Inicio', 'Comunidades', 'Parroquias', 'Personas', 'Reportes'],
    hidden: ['Administración'],
  },
  zone_leader: {
    visible: ['Inicio', 'Comunidades', 'Parroquias', 'Personas', 'Reportes'],
    hidden: ['Administración'],
  },
  zone_contributor: {
    visible: ['Inicio', 'Comunidades', 'Parroquias', 'Personas'],
    hidden: ['Reportes', 'Administración'],
  },
  community_responsible: {
    visible: ['Inicio', 'Comunidades'],
    hidden: ['Parroquias', 'Personas', 'Reportes', 'Administración'],
  },
  viewer_zone: {
    visible: ['Inicio', 'Comunidades', 'Parroquias'],
    hidden: ['Personas', 'Reportes', 'Administración'],
  },
  viewer_community: {
    visible: ['Inicio', 'Comunidades'],
    hidden: ['Parroquias', 'Personas', 'Reportes', 'Administración'],
  },
  viewer_grants: {
    visible: ['Inicio', 'Comunidades'],
    hidden: ['Parroquias', 'Personas', 'Reportes', 'Administración'],
  },
  viewer_noscope: {
    visible: ['Inicio'],
    hidden: ['Comunidades', 'Parroquias', 'Personas', 'Reportes', 'Administración'],
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
        const menuButton = page.locator('[data-sidebar="trigger"]');
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

      await takeRoleScreenshot(page, roleKey, 'sidebar', {
        testCaseId: `TC-SIDEBAR-${roleKey.toUpperCase()}`,
      });
    });
  }
});
