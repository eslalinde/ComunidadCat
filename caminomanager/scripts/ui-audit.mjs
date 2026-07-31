import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(entryPath) : [entryPath];
    }),
  );

  return files.flat();
}

function relative(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, "/");
}

function countMatches(content, pattern) {
  return [...content.matchAll(pattern)].length;
}

const allSourceFiles = await walk(path.join(root, "src"));
const sourceFiles = allSourceFiles.filter((file) => /\.[jt]sx?$/.test(file));
const sourceEntries = await Promise.all(
  sourceFiles.map(async (file) => [relative(file), await readFile(file, "utf8")]),
);

const uiFiles = sourceEntries
  .filter(([file]) => file.startsWith("src/components/ui/") && file.endsWith(".tsx"))
  .map(([file]) => file);

const productionEntries = sourceEntries.filter(
  ([file]) =>
    !file.startsWith("src/components/ui/") &&
    !file.includes("/__tests__/") &&
    !/\.(test|spec)\.[jt]sx?$/.test(file),
);

const uiImportCounts = new Map();
const uiConsumerFiles = new Set();
let uiImportReferences = 0;

for (const [file, content] of sourceEntries) {
  const matches = content.matchAll(/@\/components\/ui\/([A-Za-z0-9_-]+)/g);
  for (const match of matches) {
    const component = match[1];
    uiImportReferences += 1;
    uiConsumerFiles.add(file);
    uiImportCounts.set(component, (uiImportCounts.get(component) ?? 0) + 1);
  }
}

const nativeControls = [];
const directRadixConsumers = [];

for (const [file, content] of productionEntries) {
  const controls = countMatches(content, /<(button|input|select|textarea)\b/g);
  if (controls > 0) {
    nativeControls.push({ file, occurrences: controls });
  }
  if (/from\s+["']radix-ui["']/.test(content)) {
    directRadixConsumers.push(file);
  }
}

const e2eFiles = (await walk(path.join(root, "e2e"))).filter((file) =>
  file.endsWith(".spec.ts"),
);
const unitTestFiles = sourceFiles.filter((file) =>
  /\.(test|spec)\.[jt]sx?$/.test(file),
);
const globalCss = await readFile(path.join(root, "src/app/globals.css"), "utf8");
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));

const report = {
  generatedAt: new Date().toISOString(),
  stack: {
    next: packageJson.dependencies.next,
    react: packageJson.dependencies.react,
    tailwindcss: packageJson.devDependencies.tailwindcss,
    radixUi: packageJson.dependencies["radix-ui"],
    reactHookForm: packageJson.dependencies["react-hook-form"],
    zod: packageJson.dependencies.zod,
    tanstackTable: packageJson.dependencies["@tanstack/react-table"],
    electron: packageJson.devDependencies.electron,
  },
  ui: {
    implementationFiles: uiFiles.length,
    importedModules: uiImportCounts.size,
    importReferences: uiImportReferences,
    consumerFiles: uiConsumerFiles.size,
    importsByModule: Object.fromEntries(
      [...uiImportCounts.entries()].sort((left, right) => right[1] - left[1]),
    ),
  },
  boundaries: {
    nativeControlOccurrences: nativeControls.reduce(
      (total, entry) => total + entry.occurrences,
      0,
    ),
    nativeControlFiles: nativeControls,
    directRadixConsumers,
  },
  styles: {
    globalCssLines: globalCss.trimEnd().split(/\r?\n/).length,
    importantDeclarations: countMatches(globalCss, /!important/g),
  },
  tests: {
    unitFiles: unitTestFiles.length,
    playwrightSpecFiles: e2eFiles.length,
  },
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("UI baseline audit");
  console.log(`- UI implementation files: ${report.ui.implementationFiles}`);
  console.log(
    `- UI imports: ${report.ui.importReferences} references across ${report.ui.consumerFiles} files`,
  );
  console.log(`- Imported UI modules: ${report.ui.importedModules}`);
  console.log(
    `- Native controls outside UI/tests: ${report.boundaries.nativeControlOccurrences} occurrences across ${report.boundaries.nativeControlFiles.length} files`,
  );
  console.log(
    `- Direct radix-ui consumers outside UI: ${report.boundaries.directRadixConsumers.length}`,
  );
  console.log(
    `- Tests: ${report.tests.unitFiles} unit files, ${report.tests.playwrightSpecFiles} Playwright specs`,
  );
  console.log(
    `- Global CSS: ${report.styles.globalCssLines} lines, ${report.styles.importantDeclarations} !important declarations`,
  );
  console.log("\nUse `npm run ui:audit -- --json` for the complete report.");
}
