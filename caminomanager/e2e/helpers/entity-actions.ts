import type { Locator, Page } from '@playwright/test';

export type EntityAction = 'Editar' | 'Eliminar';

// Mirrors MOBILE_QUERY in src/hooks/use-mobile.ts.
const MOBILE_MAX_WIDTH = 767;

export function isMobileViewport(page: Page): boolean {
  const viewport = page.viewportSize();
  return viewport !== null && viewport.width <= MOBILE_MAX_WIDTH;
}

/**
 * The control that starts an EntityTable row action. On desktop it is the
 * inline "Editar X" / "Eliminar X" icon button; on mobile cards both actions
 * live behind a single "Acciones para X" menu button, which is also where
 * focus returns after the delete dialog closes.
 */
export function entityActionTrigger(
  page: Page,
  action: EntityAction,
  itemName?: string,
): Locator {
  const prefix = isMobileViewport(page) ? 'Acciones para' : action;
  if (itemName) {
    return page.getByRole('button', { name: `${prefix} ${itemName}`, exact: true });
  }
  return page.getByRole('button', { name: new RegExp(`^${prefix} `) }).first();
}

/** Runs an EntityTable row action on either the desktop grid or mobile cards. */
export async function runEntityAction(
  page: Page,
  action: EntityAction,
  itemName?: string,
): Promise<void> {
  await entityActionTrigger(page, action, itemName).click();
  if (isMobileViewport(page)) {
    await page.getByRole('menuitem', { name: action, exact: true }).click();
  }
}
