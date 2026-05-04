import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';
import { takeRoleScreenshot } from '../helpers/screenshots';
import pg from 'pg';

// Estos tests escriben en la base de datos. Para no contaminar la comunidad 1
// (que está cableada al seed y a varios test users), creamos una comunidad
// "scratch" antes de la suite y la borramos después. Todos los tests dentro
// del describe.serial reusan ese id.
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const SCRATCH_NUMBER = `E2E-${Date.now().toString(36).slice(-6)}`;
const SCRATCH_PARISH_ID = 1; // parroquia La Visitación, en zona Norte

let scratchCommunityId: number;
let pool: pg.Pool;

test.describe.serial('Comunidades — acciones en el detalle (admin sobre comunidad scratch)', () => {
  // Toda la suite asume layout desktop. En mobile las etiquetas críticas
  // (Editar / Eliminar / Agregar) viven en spans .hidden sm:inline y los
  // selectores por nombre accesible no aplican.
  test.skip(({ viewport }) => !!viewport && viewport.width < 768, 'desktop only');

  test.beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DB_URL });
    const { rows } = await pool.query(
      `INSERT INTO public.communities (number, parish_id, born_brothers, actual_brothers)
       VALUES ($1, $2, 0, 0)
       RETURNING id`,
      [SCRATCH_NUMBER, SCRATCH_PARISH_ID]
    );
    scratchCommunityId = rows[0].id;
  });

  test.afterAll(async () => {
    if (scratchCommunityId) {
      // El FK audit_log.community_id es ON DELETE SET NULL, pero un trigger
      // de inmutabilidad bloquea cualquier UPDATE/DELETE sobre audit_log,
      // incluyendo el SET NULL implícito. session_replication_role = replica
      // hace que los triggers normales no se disparen para esta sesión, lo
      // que es seguro porque corremos como superusuario en local.
      const client = await pool.connect();
      try {
        await client.query(`SET session_replication_role = 'replica'`);
        await client.query(
          `DELETE FROM public.belongs WHERE team_id IN (SELECT id FROM public.teams WHERE community_id = $1)`,
          [scratchCommunityId]
        );
        await client.query(
          `DELETE FROM public.parish_teams WHERE team_id IN (SELECT id FROM public.teams WHERE community_id = $1)`,
          [scratchCommunityId]
        );
        await client.query(`DELETE FROM public.teams WHERE community_id = $1`, [scratchCommunityId]);
        await client.query(`DELETE FROM public.brothers WHERE community_id = $1`, [scratchCommunityId]);
        await client.query(`DELETE FROM public.community_step_log WHERE community_id = $1`, [scratchCommunityId]);
        await client.query(`DELETE FROM public.audit_log WHERE community_id = $1`, [scratchCommunityId]);
        await client.query(`DELETE FROM public.communities WHERE id = $1`, [scratchCommunityId]);
      } finally {
        await client.query(`SET session_replication_role = 'origin'`);
        client.release();
      }
    }
    await pool.end();
  });

  // ── Helpers ──
  async function gotoScratchDetail(page: Page) {
    await page.goto(`/comunidades/detalle?id=${scratchCommunityId}`);
    // El print view siempre renderiza un h1 "Ficha de Comunidad N", así que
    // anclamos el regex al inicio para quedarnos sólo con el header de pantalla.
    await expect(
      page.locator('h1').filter({ hasText: new RegExp(`^Comunidad\\s+${SCRATCH_NUMBER}\\b`) })
    ).toBeVisible({ timeout: 15_000 });
  }

  // ── 1) Editar campo numérico de la comunidad ──
  test('admin edita actual_brothers, persiste y revierte', async ({ page, loginAs }) => {
    await loginAs('admin');
    await gotoScratchDetail(page);

    // Abrir modal de edición.
    await page.getByRole('button', { name: 'Editar', exact: true }).click();
    const dialogTitle = page.getByText('Editar Comunidad');
    await expect(dialogTitle).toBeVisible({ timeout: 5_000 });

    // Cambiar "Hermanos Actuales" de 0 → 7. El input está atado por FormLabel.
    const actualBrothers = page.getByLabel('Hermanos Actuales');
    await actualBrothers.fill('7');
    await page.getByRole('button', { name: /Guardar/ }).click();

    // Toast de confirmación de la app.
    await expect(page.getByText('Comunidad actualizada', { exact: true }))
      .toBeVisible({ timeout: 5_000 });
    await expect(dialogTitle).toBeHidden({ timeout: 5_000 });

    // Verificar persistencia leyendo la DB.
    const { rows } = await pool.query(
      `SELECT actual_brothers FROM public.communities WHERE id = $1`,
      [scratchCommunityId]
    );
    expect(rows[0].actual_brothers).toBe(7);

    await takeRoleScreenshot(page, 'admin', 'community-detail-edit-saved', {
      testCaseId: 'TC-COMMUNITY-DETAIL-ADMIN-EDIT',
    });

    // Revertir desde la UI para dejar la scratch en estado conocido.
    await page.getByRole('button', { name: 'Editar', exact: true }).click();
    await expect(dialogTitle).toBeVisible({ timeout: 5_000 });
    await actualBrothers.fill('0');
    await page.getByRole('button', { name: /Guardar/ }).click();
    await expect(dialogTitle).toBeHidden({ timeout: 5_000 });
  });

  // ── 2) Crear y borrar Equipo de Responsables ──
  test('admin crea Equipo de Responsables y lo borra', async ({ page, loginAs }) => {
    await loginAs('admin');
    await gotoScratchDetail(page);

    // Empty state: la scratch arranca sin equipos, así que aparece el CTA.
    const createBtn = page.getByRole('button', { name: /Crear Equipo de Responsables/ });
    await expect(createBtn).toBeVisible({ timeout: 5_000 });
    await createBtn.click();

    // Toast + nuevo TeamSection con el título "Equipo de Responsables".
    // CardTitle de shadcn renderiza un div con data-slot, no un heading ARIA.
    await expect(page.getByText('Equipo de responsables creado', { exact: true }))
      .toBeVisible({ timeout: 5_000 });
    await expect(
      page.locator('[data-slot="card-title"]').filter({ hasText: 'Equipo de Responsables' })
    ).toBeVisible({ timeout: 5_000 });

    // Verificar en DB que el INSERT ocurrió.
    const { rows: afterCreate } = await pool.query(
      `SELECT id FROM public.teams WHERE community_id = $1 AND team_type_id = 4`,
      [scratchCommunityId]
    );
    expect(afterCreate.length).toBe(1);

    await takeRoleScreenshot(page, 'admin', 'community-detail-team-created', {
      testCaseId: 'TC-COMMUNITY-DETAIL-ADMIN-CREATE-TEAM',
    });

    // Borrar el equipo desde la UI (TeamSection).
    await page.getByRole('button', { name: /Eliminar Equipo/ }).click();
    // ConfirmDeleteDialog exige escribir "eliminar" antes de habilitar el botón.
    const confirmDialog = page.getByRole('dialog').filter({ hasText: /Eliminar equipo/i });
    await expect(confirmDialog).toBeVisible({ timeout: 5_000 });
    await confirmDialog.getByPlaceholder(/Escribe eliminar/i).fill('eliminar');
    await confirmDialog.getByRole('button', { name: 'Eliminar', exact: true }).click();

    await expect(page.getByText('Equipo eliminado correctamente', { exact: true }))
      .toBeVisible({ timeout: 5_000 });

    // En DB ya no hay equipo de responsables para la scratch.
    const { rows: afterDelete } = await pool.query(
      `SELECT id FROM public.teams WHERE community_id = $1 AND team_type_id = 4`,
      [scratchCommunityId]
    );
    expect(afterDelete.length).toBe(0);
  });

  // ── 3) Agregar y borrar entrada de bitácora ──
  test('admin agrega y borra una entrada de bitácora', async ({ page, loginAs }) => {
    await loginAs('admin');
    await gotoScratchDetail(page);

    // El botón "Agregar" sólo está dentro del card de Bitácora; lo localizamos
    // por proximidad al título.
    const bitacoraCard = page.locator(':scope:has(> * h3, > * h2)').filter({
      hasText: 'Bitácora',
    }).first();
    // Fallback genérico si el filter por h3/h2 no matchea: cualquier ancestro
    // con el texto "Bitácora".
    const bitacoraScope = (await bitacoraCard.count()) > 0
      ? bitacoraCard
      : page.locator('div', { hasText: 'Bitácora' }).first();

    await bitacoraScope.getByRole('button', { name: 'Agregar', exact: true }).click();

    const dialogTitle = page.getByText('Agregar Registro a la Bitácora');
    await expect(dialogTitle).toBeVisible({ timeout: 5_000 });

    // Llenar sólo lo mínimo necesario. Todos los campos del config son opcionales.
    const note = `E2E note ${Date.now()}`;
    await page.getByLabel('Notas').fill(note);
    await page.getByRole('button', { name: /Guardar/ }).click();
    await expect(dialogTitle).toBeHidden({ timeout: 5_000 });

    // La nota se renderiza en la lista compacta y también en las vistas de
    // print/expandida. Con que aparezca en al menos una nos basta.
    await expect(page.getByText(note, { exact: true }).first())
      .toBeVisible({ timeout: 5_000 });

    const { rows: afterInsert } = await pool.query(
      `SELECT id FROM public.community_step_log WHERE community_id = $1 AND notes = $2`,
      [scratchCommunityId, note]
    );
    expect(afterInsert.length).toBe(1);

    await takeRoleScreenshot(page, 'admin', 'community-detail-steplog-added', {
      testCaseId: 'TC-COMMUNITY-DETAIL-ADMIN-STEPLOG',
    });

    // Limpieza directa por DB: la UI tiene el botón pero su selector depende
    // del row específico y agrega fragilidad sin cubrir un permiso nuevo.
    await pool.query(
      `DELETE FROM public.community_step_log WHERE community_id = $1 AND notes = $2`,
      [scratchCommunityId, note]
    );
  });

  // ── 4) Contributor agrega Equipo de Catequistas ──
  test('contributor agrega Equipo de Catequistas y NO ve botón de eliminar comunidad', async ({ page, loginAs }) => {
    await loginAs('contributor');
    await gotoScratchDetail(page);

    // El contributor no debe ver el botón "Eliminar" del encabezado
    // (canDeleteCommunity exige admin o zone_leader).
    const deleteCount = await page.getByRole('button', { name: 'Eliminar', exact: true }).count();
    expect(deleteCount, 'contributor no debería ver el botón "Eliminar" de la comunidad').toBe(0);

    // Empty state inicial para catequistas.
    const createBtn = page.getByRole('button', { name: /Crear Equipo de Catequistas/ });
    await expect(createBtn).toBeVisible({ timeout: 5_000 });
    await createBtn.click();

    await expect(page.getByText('Equipo de catequistas creado', { exact: true }))
      .toBeVisible({ timeout: 5_000 });

    // Apareció un TeamSection con el patrón "Equipo de Catequistas N".
    await expect(
      page.locator('[data-slot="card-title"]').filter({ hasText: /Equipo de Catequistas/ })
    ).toBeVisible({ timeout: 5_000 });

    const { rows: afterCreate } = await pool.query(
      `SELECT id FROM public.teams WHERE community_id = $1 AND team_type_id = 3`,
      [scratchCommunityId]
    );
    expect(afterCreate.length).toBeGreaterThanOrEqual(1);

    await takeRoleScreenshot(page, 'contributor', 'community-detail-catequistas-created', {
      testCaseId: 'TC-COMMUNITY-DETAIL-CONTRIBUTOR-CATEQUISTAS',
    });

    // Limpieza por DB para no acoplar este test al UI de borrado de equipo
    // (que ya quedó cubierto en el test anterior).
    await pool.query(
      `DELETE FROM public.belongs WHERE team_id IN (
         SELECT id FROM public.teams WHERE community_id = $1 AND team_type_id = 3
       )`,
      [scratchCommunityId]
    );
    await pool.query(
      `DELETE FROM public.teams WHERE community_id = $1 AND team_type_id = 3`,
      [scratchCommunityId]
    );
  });
});
