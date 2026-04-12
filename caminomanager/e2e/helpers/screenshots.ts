import { type Page } from '@playwright/test';
import path from 'path';

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');

export async function takeRoleScreenshot(
  page: Page,
  role: string,
  pageName: string,
  options?: { fullPage?: boolean }
): Promise<string> {
  const viewport = page.viewportSize();
  const viewportLabel = viewport && viewport.width <= 480 ? 'mobile' : 'desktop';
  const fileName = `${role}--${pageName}_${viewportLabel}.png`;
  const filePath = path.join(SCREENSHOTS_DIR, fileName);

  await page.screenshot({
    path: filePath,
    fullPage: options?.fullPage ?? true,
  });

  return filePath;
}

export { SCREENSHOTS_DIR };
