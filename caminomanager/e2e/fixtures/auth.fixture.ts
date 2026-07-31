import { test as base, type Page } from '@playwright/test';
import { TEST_USERS, type TestUser } from './test-users';

async function loginAs(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login');
  await page.waitForSelector('form', { timeout: 15_000 });
  await page.getByLabel(/correo/i).fill(user.email);
  await page.getByLabel(/contraseña/i).fill(user.password);
  await page.getByRole('button', { name: /ingresar/i }).click();

  const outcome = await Promise.race([
    page
      .waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 })
      .then(() => 'authenticated' as const)
      .catch(() => 'timeout' as const),
    page
      .getByText(/Credenciales inválidas/i)
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => 'invalid-credentials' as const)
      .catch(() => 'timeout' as const),
  ]);

  if (outcome === 'invalid-credentials') {
    throw new Error(
      `No fue posible autenticar ${user.email}. Verifica que Supabase local esté activo y ejecuta "npm run seed:e2e" antes de Playwright.`
    );
  }

  if (outcome !== 'authenticated') {
    throw new Error(
      `El login de ${user.email} no terminó en 15 segundos. Revisa Supabase local y el servidor de Next.js.`
    );
  }
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
