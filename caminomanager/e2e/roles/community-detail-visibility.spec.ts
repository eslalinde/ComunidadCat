import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';
import { TEST_USERS, ALL_ROLE_KEYS } from '../fixtures/test-users';
import { takeRoleScreenshot } from '../helpers/screenshots';

// Comunidad 1 está en la zona Norte (id 1) y en la parroquia 1.
// El seed la asigna como community_id de community_responsible y viewer_community,
// y le otorga grants explícitos a viewer_grants. Todos los demás roles con scope
// global o de zona Norte también pueden leerla.
const COMMUNITY_ID = 1;
const DETAIL_URL = `/comunidades/detalle?id=${COMMUNITY_ID}`;

interface DetailVisibility {
  // ¿El rol puede entrar al detalle? (false = redirigido por el layout protegido)
  canLoad: boolean;
  // Botones del encabezado del detalle
  editar: boolean;       // CommunityInfo → "Editar"
  imprimir: boolean;     // dropdown "Imprimir"
  fusionar: boolean;     // botón "Fusionar"
  usuarios: boolean;     // CommunityAccessSection → "Usuarios"
  historial: boolean;    // AuditLogSheet → "Historial"
  eliminar: boolean;     // botón "Eliminar" comunidad (no "Eliminar Equipo")
  // Tarjetas / acciones internas
  bitacora: boolean;        // tarjeta "Bitácora" visible
  bitacoraAgregar: boolean; // botón "Agregar" dentro de la bitácora
  agregarHermano: boolean;  // botón "Agregar Existente" en lista de hermanos
}

// Valores derivados a mano de src/lib/permissions.ts. Si cambian las reglas,
// este mapa es el primero que tiene que actualizarse.
const EXPECTED: Record<string, DetailVisibility> = {
  admin: {
    canLoad: true,
    editar: true, imprimir: true, fusionar: true, usuarios: true,
    historial: true, eliminar: true,
    bitacora: true, bitacoraAgregar: true, agregarHermano: true,
  },
  contributor: {
    canLoad: true,
    editar: true, imprimir: true, fusionar: true, usuarios: true,
    historial: true, eliminar: false,
    bitacora: true, bitacoraAgregar: true, agregarHermano: true,
  },
  zone_leader: {
    canLoad: true,
    editar: true, imprimir: true, fusionar: true, usuarios: true,
    historial: true, eliminar: true,
    bitacora: true, bitacoraAgregar: true, agregarHermano: true,
  },
  zone_contributor: {
    canLoad: true,
    editar: true, imprimir: true, fusionar: false, usuarios: false,
    historial: true, eliminar: false,
    bitacora: true, bitacoraAgregar: true, agregarHermano: true,
  },
  community_responsible: {
    canLoad: true,
    editar: false, imprimir: true, fusionar: false, usuarios: false,
    historial: false, eliminar: false,
    // canViewStepLog excluye a community_responsible, así que la bitácora no se renderiza.
    // canPrintHermanos sí está activo, por eso "Imprimir" sigue apareciendo.
    bitacora: false, bitacoraAgregar: false, agregarHermano: true,
  },
  viewer_zone: {
    canLoad: true,
    editar: false, imprimir: true, fusionar: false, usuarios: false,
    historial: false, eliminar: false,
    bitacora: true, bitacoraAgregar: false, agregarHermano: false,
  },
  viewer_community: {
    canLoad: true,
    editar: false, imprimir: true, fusionar: false, usuarios: false,
    historial: false, eliminar: false,
    bitacora: true, bitacoraAgregar: false, agregarHermano: false,
  },
  viewer_grants: {
    canLoad: true,
    editar: false, imprimir: true, fusionar: false, usuarios: false,
    historial: false, eliminar: false,
    bitacora: true, bitacoraAgregar: false, agregarHermano: false,
  },
  viewer_noscope: {
    canLoad: false,
    editar: false, imprimir: false, fusionar: false, usuarios: false,
    historial: false, eliminar: false,
    bitacora: false, bitacoraAgregar: false, agregarHermano: false,
  },
};

async function waitForCommunityHeader(page: Page) {
  // El header de pantalla dice "Comunidad N"; el print view siempre renderiza
  // "Ficha de Comunidad N". Anclamos al inicio para quedarnos con la pantalla.
  await expect(page.locator('h1').filter({ hasText: /^Comunidad\s+\S+/ }))
    .toBeVisible({ timeout: 15_000 });
}

async function expectCount(
  page: Page,
  locator: ReturnType<Page['getByRole']> | ReturnType<Page['locator']> | ReturnType<Page['getByText']>,
  shouldBeVisible: boolean,
  label: string,
  roleKey: string,
) {
  if (shouldBeVisible) {
    await expect(locator, `${roleKey} debería ver "${label}" pero no aparece`)
      .toBeVisible({ timeout: 5_000 });
  } else {
    const count = await locator.count();
    expect(count, `${roleKey} NO debería ver "${label}" pero aparece ${count} vez(ces)`).toBe(0);
  }
}

test.describe('Comunidades — visibilidad de acciones en el detalle', () => {
  // Estos tests verifican el layout desktop. En mobile las etiquetas viven en
  // <span className="hidden sm:inline">, lo que rompería los selectores por
  // texto sin aportar cobertura adicional.
  test.skip(({ viewport }) => !!viewport && viewport.width < 768, 'desktop only');

  for (const roleKey of ALL_ROLE_KEYS) {
    const user = TEST_USERS[roleKey];
    const expected = EXPECTED[roleKey];

    test(`${user.label} (${roleKey}): detalle muestra los controles correctos`, async ({ page, loginAs }) => {
      await loginAs(roleKey);
      await page.goto(DETAIL_URL);

      if (!expected.canLoad) {
        // El layout protegido redirige fuera de /comunidades.
        await page.waitForURL((url) => !url.pathname.startsWith('/comunidades'), {
          timeout: 10_000,
        });
        expect(page.url()).not.toContain('/comunidades');
        await takeRoleScreenshot(page, roleKey, 'community-detail-blocked', {
          testCaseId: `TC-COMMUNITY-DETAIL-${roleKey.toUpperCase()}-BLOCKED`,
        });
        return;
      }

      await waitForCommunityHeader(page);

      // ── Encabezado ───────────────────────────────────────────────────────
      await expectCount(
        page,
        page.getByRole('button', { name: 'Editar', exact: true }),
        expected.editar, 'Editar', roleKey,
      );
      await expectCount(
        page,
        page.getByRole('button', { name: /Imprimir/ }),
        expected.imprimir, 'Imprimir', roleKey,
      );
      await expectCount(
        page,
        page.getByRole('button', { name: /Fusionar/ }),
        expected.fusionar, 'Fusionar', roleKey,
      );
      await expectCount(
        page,
        page.getByRole('button', { name: /Usuarios/ }),
        expected.usuarios, 'Usuarios (acceso)', roleKey,
      );
      await expectCount(
        page,
        page.getByRole('button', { name: /Historial/ }),
        expected.historial, 'Historial (auditoría)', roleKey,
      );
      // Hay también "Eliminar Equipo" dentro de TeamSection; "Eliminar" exacto
      // sólo coincide con el botón del encabezado de la comunidad.
      await expectCount(
        page,
        page.getByRole('button', { name: 'Eliminar', exact: true }),
        expected.eliminar, 'Eliminar comunidad', roleKey,
      );

      // ── Bitácora ─────────────────────────────────────────────────────────
      // Hay dos textos "Bitácora" en el DOM: la tarjeta visible (data-slot
      // card-title) y la versión impresa (h2.pv-bitacora-title). Filtramos al
      // card-title para no chocar contra la print view.
      const bitacoraCardTitle = page
        .locator('[data-slot="card-title"]')
        .filter({ hasText: 'Bitácora' });
      await expectCount(page, bitacoraCardTitle, expected.bitacora, 'tarjeta Bitácora', roleKey);

      if (expected.bitacora) {
        // El botón "Agregar" está dentro de la tarjeta de la bitácora.
        const bitacoraCard = page
          .locator('[data-slot="card"]')
          .filter({ has: bitacoraCardTitle });

        await expectCount(
          page,
          bitacoraCard.getByRole('button', { name: 'Agregar', exact: true }),
          expected.bitacoraAgregar, 'Bitácora → Agregar', roleKey,
        );
      }

      // ── Lista de hermanos ────────────────────────────────────────────────
      // El título "Hermanos de la Comunidad" siempre se renderiza; lo que cambia
      // según permisos es la presencia de los botones de agregar.
      await expect(page.getByText('Hermanos de la Comunidad'))
        .toBeVisible({ timeout: 10_000 });
      await expectCount(
        page,
        page.getByRole('button', { name: /Agregar Existente/ }),
        expected.agregarHermano, 'Agregar Existente (hermano)', roleKey,
      );

      await takeRoleScreenshot(page, roleKey, 'community-detail', {
        testCaseId: `TC-COMMUNITY-DETAIL-${roleKey.toUpperCase()}`,
      });
    });
  }
});
