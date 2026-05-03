import { test as base, type Page } from '@playwright/test';
import { TEST_USERS, type TestUser } from './test-users';

async function loginAs(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login');
  await page.waitForSelector('form', { timeout: 15_000 });
  await page.getByLabel(/correo/i).fill(user.email);
  await page.getByLabel(/contraseña/i).fill(user.password);
  await page.getByRole('button', { name: /ingresar/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 15_000,
  });
}

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
