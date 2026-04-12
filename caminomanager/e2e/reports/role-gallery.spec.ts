import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const REPORT_PATH = path.join(SCREENSHOTS_DIR, 'role-report.html');

test('Generate role screenshot comparison report', async () => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const files = fs.readdirSync(SCREENSHOTS_DIR).filter((f) => f.endsWith('.png'));

  if (files.length === 0) {
    console.log('No screenshots found. Run the role tests first.');
    return;
  }

  interface ScreenshotInfo {
    role: string;
    page: string;
    viewport: string;
    filename: string;
  }

  const screenshots: ScreenshotInfo[] = files.map((f) => {
    const nameWithoutExt = f.replace('.png', '');
    const [role, rest] = nameWithoutExt.split('--');
    const lastUnderscore = rest.lastIndexOf('_');
    const page = rest.substring(0, lastUnderscore);
    const viewport = rest.substring(lastUnderscore + 1);
    return { role, page, viewport, filename: f };
  });

  const byPage = new Map<string, ScreenshotInfo[]>();
  for (const s of screenshots) {
    const key = `${s.page} (${s.viewport})`;
    if (!byPage.has(key)) byPage.set(key, []);
    byPage.get(key)!.push(s);
  }

  const roleOrder = [
    'admin', 'contributor', 'zone_leader', 'zone_contributor',
    'community_responsible', 'viewer_zone', 'viewer_community',
    'viewer_grants', 'viewer_noscope',
  ];

  const sortByRole = (a: ScreenshotInfo, b: ScreenshotInfo) =>
    roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    contributor: 'Contribuidor',
    zone_leader: 'Jefe de Zona',
    zone_contributor: 'Contribuidor Zona',
    community_responsible: 'Resp. Comunidad',
    viewer_zone: 'Viewer (zona)',
    viewer_community: 'Viewer (comunidad)',
    viewer_grants: 'Viewer (grants)',
    viewer_noscope: 'Viewer (sin alcance)',
  };

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Role Screenshot Report - VibeCaminoManager</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 2rem; }
    h1 { color: #1B3A6F; margin-bottom: 0.5rem; }
    .subtitle { color: #666; margin-bottom: 2rem; }
    .page-section { background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .page-section h2 { color: #333; margin-bottom: 1rem; border-bottom: 2px solid #1B3A6F; padding-bottom: 0.5rem; }
    .screenshots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 1.5rem; }
    .screenshot-card { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
    .screenshot-card .role-label {
      background: #1B3A6F; color: white; padding: 0.5rem 1rem;
      font-weight: 600; font-size: 0.9rem;
    }
    .screenshot-card img { width: 100%; height: auto; display: block; cursor: pointer; }
    .screenshot-card img:hover { opacity: 0.9; }
    .timestamp { color: #999; font-size: 0.8rem; margin-top: 1rem; }
    .lightbox { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.9); z-index: 1000; justify-content: center; align-items: center; cursor: pointer; }
    .lightbox.active { display: flex; }
    .lightbox img { max-width: 95%; max-height: 95%; object-fit: contain; }
  </style>
</head>
<body>
  <h1>Role Screenshot Report</h1>
  <p class="subtitle">Visual comparison of VibeCaminoManager UI per user role. Click any image to enlarge.</p>

  ${Array.from(byPage.entries())
    .map(([pageKey, shots]) => {
      const sorted = shots.sort(sortByRole);
      return `
  <div class="page-section">
    <h2>${pageKey.toUpperCase()}</h2>
    <div class="screenshots-grid">
      ${sorted
        .map(
          (s) => `
      <div class="screenshot-card">
        <div class="role-label">${roleLabels[s.role] || s.role}</div>
        <img src="${s.filename}" alt="${s.role} - ${s.page}" onclick="openLightbox(this.src)" loading="lazy" />
      </div>`
        )
        .join('')}
    </div>
  </div>`;
    })
    .join('')}

  <p class="timestamp">Generated: ${new Date().toISOString()}</p>

  <div class="lightbox" id="lightbox" onclick="closeLightbox()">
    <img id="lightbox-img" src="" alt="Enlarged screenshot" />
  </div>

  <script>
    function openLightbox(src) {
      document.getElementById('lightbox-img').src = src;
      document.getElementById('lightbox').classList.add('active');
    }
    function closeLightbox() {
      document.getElementById('lightbox').classList.remove('active');
    }
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
  </script>
</body>
</html>`;

  fs.writeFileSync(REPORT_PATH, html, 'utf-8');
  console.log(`Report generated: ${REPORT_PATH}`);
});
