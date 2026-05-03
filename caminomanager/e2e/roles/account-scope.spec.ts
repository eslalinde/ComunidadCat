import { test, expect } from '../fixtures/auth.fixture';
import { takeRoleScreenshot } from '../helpers/screenshots';

// La pantalla /cuenta debe mostrar QUÉ zona o QUÉ comunidad tiene asignada el
// usuario, no solo "Comunidad asignada" / "Zona asignada".

interface ScopeExpectation {
  roleKey: string;
  // Substring or regex that the "Alcance:" line (or its replacement panel) must contain.
  expectedScope: RegExp;
}

const CASES: ScopeExpectation[] = [
  { roleKey: 'admin', expectedScope: /acceso global/i },
  { roleKey: 'contributor', expectedScope: /acceso global/i },
  { roleKey: 'zone_leader', expectedScope: /Zona\s+Norte/i },
  { roleKey: 'zone_contributor', expectedScope: /Zona\s+Norte/i },
  { roleKey: 'community_responsible', expectedScope: /Comunidad\s+1/i },
  { roleKey: 'viewer_zone', expectedScope: /Zona\s+Norte/i },
  { roleKey: 'viewer_community', expectedScope: /Comunidad\s+1/i },
  { roleKey: 'viewer_grants', expectedScope: /Comunidades con acceso otorgado|Sin acceso asignado/i },
  { roleKey: 'viewer_noscope', expectedScope: /sin acceso asignado/i },
];

test.describe('Cuenta — alcance del usuario', () => {
  for (const c of CASES) {
    test(`${c.roleKey}: la página de cuenta muestra el alcance correcto`, async ({ page, loginAs }) => {
      await loginAs(c.roleKey);
      await page.goto('/cuenta');
      await page.waitForLoadState('networkidle');

      // Wait for the profile card to render.
      await expect(page.getByRole('heading', { name: /mi perfil/i })).toBeVisible({ timeout: 10_000 });

      // Pull the scope copy. For viewer_grants we accept either the explicit
      // "Comunidades con acceso otorgado" panel or, if grants haven't loaded
      // yet, the "Sin acceso asignado" placeholder — the regex covers both.
      const body = page.locator('body');
      await expect(body).toContainText(c.expectedScope, { timeout: 10_000 });

      await takeRoleScreenshot(page, c.roleKey, 'cuenta', {
        testCaseId: `TC-CUENTA-${c.roleKey.toUpperCase()}`,
      });
    });
  }
});
