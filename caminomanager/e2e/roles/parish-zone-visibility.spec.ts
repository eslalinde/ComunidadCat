import { test, expect } from '../fixtures/auth.fixture';
import { takeRoleScreenshot } from '../helpers/screenshots';

// Seed assigns:
//   - Zona Norte (id 1) -> parishes 1..10  (e.g. "Parroquia La Visitación")
//   - Zona Sur   (id 2) -> parishes 11..20 (e.g. "Parroquia San Juan Bosco")
// e2e-zoneleader@test.local is created with zone_id=1, so they must only see Norte.

const ZONE_1_PARISH = 'La Visitación';
const ZONE_2_PARISH = 'San Juan Bosco';

async function readRecordCount(page: import('@playwright/test').Page): Promise<number> {
  // EntityPage prints "Página X de Y — N registros" when there is at least 1 row.
  const label = page.getByText(/—\s*\d+\s+registros/);
  await expect(label).toBeVisible({ timeout: 10_000 });
  const text = (await label.textContent()) ?? '';
  const match = text.match(/(\d+)\s+registros/);
  if (!match) throw new Error(`Could not parse record count from: "${text}"`);
  return Number(match[1]);
}

test.describe('Parroquias — alcance por zona', () => {
  test('Jefe de Zona solo ve parroquias de su zona', async ({ page, loginAs }) => {
    await loginAs('zone_leader');
    await page.goto('/parroquias');
    await page.waitForLoadState('networkidle');

    const total = await readRecordCount(page);
    expect(
      total,
      `Jefe de Zona (Norte) debería ver 10 parroquias; vio ${total}. ` +
        'Si ve más, la RLS de SELECT en parishes no está filtrando por zona.'
    ).toBe(10);

    // Search for a Sur-only parish: must yield zero results.
    const searchInput = page.getByPlaceholder(/buscar parroquia/i);
    await searchInput.fill(ZONE_2_PARISH);
    await page.waitForTimeout(500);
    await expect(
      page.getByText(/—\s*0\s+registros/).or(page.getByText(/no hay parroquias/i))
    ).toBeVisible({ timeout: 10_000 });

    await takeRoleScreenshot(page, 'zone_leader', 'parroquias-zone-scoped', {
      testCaseId: 'TC-PARROQUIAS-ZONE-LEADER-SCOPED',
    });

    // And confirm a known Norte parish IS visible after clearing the search.
    await searchInput.fill(ZONE_1_PARISH);
    await page.waitForTimeout(500);
    await expect(page.getByText(new RegExp(ZONE_1_PARISH))).toBeVisible({ timeout: 10_000 });
  });

  test('Administrador ve parroquias de todas las zonas', async ({ page, loginAs }) => {
    await loginAs('admin');
    await page.goto('/parroquias');
    await page.waitForLoadState('networkidle');

    const total = await readRecordCount(page);
    expect(
      total,
      `Admin debería ver al menos 20 parroquias; vio ${total}.`
    ).toBeGreaterThanOrEqual(20);

    const searchInput = page.getByPlaceholder(/buscar parroquia/i);
    await searchInput.fill(ZONE_2_PARISH);
    await page.waitForTimeout(500);
    await expect(page.getByText(new RegExp(ZONE_2_PARISH))).toBeVisible({ timeout: 10_000 });

    await takeRoleScreenshot(page, 'admin', 'parroquias-all-zones', {
      testCaseId: 'TC-PARROQUIAS-ADMIN-FULL',
    });
  });
});
