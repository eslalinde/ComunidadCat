import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { TEST_CASES, getTestCase, type TestCase } from '../test-cases';

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const REPORT_PATH = path.join(SCREENSHOTS_DIR, 'role-report.html');

interface ScreenshotInfo {
  role: string;
  page: string;
  viewport: string;
  filename: string;
  testCaseId?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readSidecar(dir: string, baseName: string): string | undefined {
  const metaPath = path.join(dir, `${baseName}.json`);
  if (!fs.existsSync(metaPath)) return undefined;
  try {
    const parsed = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    return typeof parsed.testCaseId === 'string' ? parsed.testCaseId : undefined;
  } catch {
    return undefined;
  }
}

function renderTestCaseBlock(tc: TestCase): string {
  const stepsList = tc.steps
    .map((s) => `<li>${escapeHtml(s)}</li>`)
    .join('');
  return `
    <div class="testcase">
      <div class="testcase-id">${escapeHtml(tc.id)}</div>
      <div class="testcase-title">${escapeHtml(tc.title)}</div>
      <div class="testcase-meta"><strong>Área:</strong> ${escapeHtml(tc.area)} · <strong>Rol:</strong> ${escapeHtml(tc.role)}</div>
      <div class="testcase-section"><strong>Pasos:</strong><ol>${stepsList}</ol></div>
      <div class="testcase-section"><strong>Resultado esperado:</strong> ${escapeHtml(tc.expected)}</div>
    </div>
  `;
}

function renderUnknownTestCaseBlock(id: string): string {
  return `
    <div class="testcase testcase-missing">
      <div class="testcase-id">${escapeHtml(id)}</div>
      <div class="testcase-title">⚠️ Caso no encontrado en el catálogo</div>
      <div class="testcase-meta">Agregar entrada en <code>e2e/test-cases.ts</code>.</div>
    </div>
  `;
}

function renderCatalogIndex(): string {
  const grouped = new Map<string, TestCase[]>();
  for (const tc of TEST_CASES) {
    const list = grouped.get(tc.area) ?? [];
    list.push(tc);
    grouped.set(tc.area, list);
  }
  const sections = Array.from(grouped.entries())
    .map(([area, cases]) => {
      const rows = cases
        .map(
          (tc) => `
          <tr>
            <td><code>${escapeHtml(tc.id)}</code></td>
            <td>${escapeHtml(tc.role)}</td>
            <td>${escapeHtml(tc.title)}</td>
            <td>${escapeHtml(tc.expected)}</td>
          </tr>`
        )
        .join('');
      return `
        <h3 class="catalog-area">${escapeHtml(area)}</h3>
        <table class="catalog-table">
          <thead>
            <tr><th>ID</th><th>Rol</th><th>Título</th><th>Resultado esperado</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    })
    .join('');
  return `
    <details class="catalog">
      <summary>📋 Catálogo de casos de prueba (${TEST_CASES.length})</summary>
      ${sections}
    </details>
  `;
}

test('Generate role screenshot comparison report', async () => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const files = fs.readdirSync(SCREENSHOTS_DIR).filter((f) => f.endsWith('.png'));

  if (files.length === 0) {
    console.log('No screenshots found. Run the role tests first.');
    return;
  }

  const screenshots: ScreenshotInfo[] = files.map((f) => {
    const nameWithoutExt = f.replace('.png', '');
    const [role, rest] = nameWithoutExt.split('--');
    const lastUnderscore = rest.lastIndexOf('_');
    const page = rest.substring(0, lastUnderscore);
    const viewport = rest.substring(lastUnderscore + 1);
    const testCaseId = readSidecar(SCREENSHOTS_DIR, nameWithoutExt);
    return { role, page, viewport, filename: f, testCaseId };
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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 2rem; color: #1f2937; }
    h1 { color: #1B3A6F; margin-bottom: 0.5rem; }
    .subtitle { color: #666; margin-bottom: 2rem; }
    .page-section { background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .page-section h2 { color: #333; margin-bottom: 1rem; border-bottom: 2px solid #1B3A6F; padding-bottom: 0.5rem; }
    .screenshots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 1.5rem; }
    .screenshot-card { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background: #fafafa; display: flex; flex-direction: column; }
    .screenshot-card .role-label {
      background: #1B3A6F; color: white; padding: 0.5rem 1rem;
      font-weight: 600; font-size: 0.9rem;
    }
    .screenshot-card img { width: 100%; height: auto; display: block; cursor: pointer; }
    .screenshot-card img:hover { opacity: 0.9; }
    .testcase { padding: 0.75rem 1rem; border-top: 1px solid #e0e0e0; background: #f8fafc; font-size: 0.85rem; }
    .testcase-id { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.75rem; color: #6b7280; letter-spacing: 0.02em; }
    .testcase-title { font-weight: 600; color: #111827; margin-top: 0.15rem; }
    .testcase-meta { color: #4b5563; font-size: 0.8rem; margin-top: 0.25rem; }
    .testcase-section { margin-top: 0.5rem; color: #1f2937; }
    .testcase-section ol { margin: 0.25rem 0 0 1.25rem; padding: 0; }
    .testcase-section li { margin-bottom: 0.15rem; }
    .testcase-missing { background: #fff7ed; border-left: 3px solid #f97316; }
    .no-testcase { padding: 0.5rem 1rem; border-top: 1px solid #e0e0e0; font-size: 0.75rem; color: #9ca3af; background: #fafafa; }
    .timestamp { color: #999; font-size: 0.8rem; margin-top: 1rem; }
    .lightbox { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.9); z-index: 1000; justify-content: center; align-items: center; cursor: pointer; }
    .lightbox.active { display: flex; }
    .lightbox img { max-width: 95%; max-height: 95%; object-fit: contain; }
    .catalog { background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .catalog summary { cursor: pointer; font-weight: 600; font-size: 1rem; color: #1B3A6F; }
    .catalog-area { margin-top: 1rem; color: #1B3A6F; font-size: 1rem; }
    .catalog-table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 0.85rem; }
    .catalog-table th, .catalog-table td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    .catalog-table th { background: #f3f4f6; font-weight: 600; color: #374151; }
    .catalog-table code { font-size: 0.78rem; }
  </style>
</head>
<body>
  <h1>Role Screenshot Report</h1>
  <p class="subtitle">Comparación visual de la UI de VibeCaminoManager por rol. Cada imagen muestra debajo el caso de prueba que documenta el comportamiento esperado. Click sobre la imagen para ampliarla.</p>

  ${renderCatalogIndex()}

  ${Array.from(byPage.entries())
    .map(([pageKey, shots]) => {
      const sorted = shots.sort(sortByRole);
      return `
  <div class="page-section">
    <h2>${escapeHtml(pageKey.toUpperCase())}</h2>
    <div class="screenshots-grid">
      ${sorted
        .map((s) => {
          const tc = s.testCaseId ? getTestCase(s.testCaseId) : undefined;
          const tcBlock = s.testCaseId
            ? tc
              ? renderTestCaseBlock(tc)
              : renderUnknownTestCaseBlock(s.testCaseId)
            : '<div class="no-testcase">Sin caso de prueba asociado.</div>';
          return `
      <div class="screenshot-card">
        <div class="role-label">${escapeHtml(roleLabels[s.role] || s.role)}</div>
        <img src="${escapeHtml(s.filename)}" alt="${escapeHtml(s.role)} - ${escapeHtml(s.page)}" onclick="openLightbox(this.src)" loading="lazy" />
        ${tcBlock}
      </div>`;
        })
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
