import { test, expect } from '../fixtures/auth.fixture';
import { takeRoleScreenshot } from '../helpers/screenshots';

test.describe('Admin panel access', () => {
  test('admin can see user management', async ({ page, loginAs }) => {
    await loginAs('admin');
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/usuarios|gestión/i).first()).toBeVisible();

    await takeRoleScreenshot(page, 'admin', 'admin-panel', {
      testCaseId: 'TC-ADMIN-PANEL-ADMIN',
    });
  });

  test('contributor cannot access admin panel', async ({ page, loginAs }) => {
    await loginAs('contributor');
    await page.goto('/admin');

    await page.waitForURL((url) => !url.pathname.startsWith('/admin'), { timeout: 10_000 });
    expect(page.url()).not.toContain('/admin');
    await takeRoleScreenshot(page, 'contributor', 'admin-blocked', {
      testCaseId: 'TC-ADMIN-PANEL-CONTRIBUTOR-BLOCKED',
    });
  });

  test('viewer cannot access admin panel', async ({ page, loginAs }) => {
    await loginAs('viewer_noscope');
    await page.goto('/admin');

    await page.waitForURL((url) => !url.pathname.startsWith('/admin'), { timeout: 10_000 });
    expect(page.url()).not.toContain('/admin');
    await takeRoleScreenshot(page, 'viewer_noscope', 'admin-blocked', {
      testCaseId: 'TC-ADMIN-PANEL-VIEWER-BLOCKED',
    });
  });
});
