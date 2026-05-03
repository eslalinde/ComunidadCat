import { type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');

export interface ScreenshotOptions {
  fullPage?: boolean;
  testCaseId?: string;
}

export async function takeRoleScreenshot(
  page: Page,
  role: string,
  pageName: string,
  options?: ScreenshotOptions
): Promise<string> {
  const viewport = page.viewportSize();
  const viewportLabel = viewport && viewport.width <= 480 ? 'mobile' : 'desktop';
  const baseName = `${role}--${pageName}_${viewportLabel}`;
  const filePath = path.join(SCREENSHOTS_DIR, `${baseName}.png`);

  await page.screenshot({
    path: filePath,
    fullPage: options?.fullPage ?? true,
  });

  if (options?.testCaseId) {
    const metaPath = path.join(SCREENSHOTS_DIR, `${baseName}.json`);
    fs.writeFileSync(
      metaPath,
      JSON.stringify({ testCaseId: options.testCaseId }, null, 2),
      'utf-8'
    );
  }

  return filePath;
}

export { SCREENSHOTS_DIR };
