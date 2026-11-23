import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { appendFile, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const stable = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function releaseVersion(pkg, lock) {
  assert.match(pkg.version, stable, 'Se requiere una versión estable para producción.');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  return pkg.version;
}

export function assetNames(version) {
  const cloud = `ComunidadCat-Cloud-${version}-Setup.exe`;
  const standalone = `ComunidadCat-Standalone-${version}`;
  return [cloud, `${cloud}.blockmap`, 'latest.yml', `${standalone}-Setup.exe`, `${standalone}.zip`].sort();
}

export function verifyAssets(assets, hashes, version) {
  assert.deepEqual(Object.keys(hashes).sort(), assetNames(version));
  assert.deepEqual(assets.map(asset => asset.name).sort(), assetNames(version));
  for (const asset of assets) {
    assert.equal(asset.state, 'uploaded');
    assert.ok(asset.size > 0);
    assert.match(hashes[asset.name], /^sha256:[a-f0-9]{64}$/);
    assert.equal(asset.digest, hashes[asset.name], `Contenido inesperado: ${asset.name}`);
  }
}

export function checkReleaseHistory(releases, version, sha) {
  const tag = `v${version}`;
  const release = releases.find(item => item.tag_name === tag);
  if (release) {
    assert.equal(release.target_commitish, sha, 'El release pertenece a otro candidato.');
    assert.equal(release.prerelease, false);
  }
  for (const other of releases.filter(item => !item.draft && !item.prerelease)) {
    const previous = other.tag_name.replace(/^v/, '');
    if (stable.test(previous)) {
      const parts = version.split('.').map(BigInt);
      const old = previous.split('.').map(BigInt);
      const difference = parts.findIndex((part, i) => part !== old[i]);
      assert.ok(difference === -1 || parts[difference] > old[difference], 'Ya existe una versión estable posterior.');
    }
  }
  return release;
}

async function run(mode) {
  const { GITHUB_SHA: sha, GITHUB_REPOSITORY: repo } = process.env;
  assert.match(sha, /^[0-9a-f]{40}$/);
  const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim();
  const api = route => JSON.parse(gh('api', `repos/${repo}/${route}`));
  const jsonFile = async path => JSON.parse(await readFile(path, 'utf8'));
  const version = releaseVersion(await jsonFile('caminomanager/package.json'), await jsonFile('caminomanager/package-lock.json'));
  const tag = `v${version}`;
  const releaseUrl = `https://github.com/${repo}/releases/tag/${tag}`;

  assert.equal(api('git/ref/heads/main').object.sha, sha, 'main cambió. Preparar su nuevo SHA.');
  const tagRef = api(`git/matching-refs/tags/${tag}`).find(ref => ref.ref === `refs/tags/${tag}`);
  if (tagRef) assert.equal(api(`commits/${tag}`).sha, sha, 'La etiqueta ya identifica otro commit.');
  const releases = JSON.parse(gh('api', '--paginate', '--slurp', `repos/${repo}/releases?per_page=100`)).flat();
  const release = checkReleaseHistory(releases, version, sha);
  if (mode === 'check' || mode === 'draft') {
    assert.ok(!release || release.draft, 'Versión publicada. Para reanudar la promoción, reintentar solo el job fallido.');
    if (mode === 'check') return;

    const dir = 'signed-windows';
    const names = assetNames(version);
    assert.deepEqual((await readdir(dir)).sort(), names);
    const hashes = {};
    for (const name of names) {
      const hash = createHash('sha256');
      for await (const chunk of createReadStream(join(dir, name))) hash.update(chunk);
      hashes[name] = `sha256:${hash.digest('hex')}`;
    }
    if (!release) {
      gh('release', 'create', tag, '--target', sha, '--draft', '--title', `ComunidadCat ${version}`,
        '--generate-notes', '--notes', 'Consulta los cambios de esta versión y las descargas de Windows.');
    }
    gh('release', 'upload', tag, ...names.map(name => join(dir, name)), '--clobber');
    const draft = JSON.parse(gh('release', 'view', tag, '--json', 'databaseId,isDraft,targetCommitish,url'));
    assert.ok(draft.isDraft && draft.targetCommitish === sha);
    verifyAssets(api(`releases/${draft.databaseId}/assets`), hashes, version);
    await appendFile(process.env.GITHUB_OUTPUT, `hashes=${JSON.stringify(hashes)}\nrelease_id=${draft.databaseId}\n`);
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `Revisar [el borrador](${draft.url}) de **${tag}** para \`${sha}\`.\n\n${names.map(name => '- ' + name).join('\n')}\n`);
    return;
  }

  assert.ok(['verify', 'publish'].includes(mode));
  assert.ok(release && String(release.id) === process.env.RELEASE_ID, 'El borrador aprobado cambió.');
  verifyAssets(api(`releases/${release.id}/assets`), JSON.parse(process.env.RELEASE_HASHES), version);
  if (mode === 'publish') {
    if (release.draft) gh('release', 'edit', tag, '--draft=false', '--latest');
    assert.equal(api(`commits/${tag}`).sha, sha);
    assert.equal(api(`releases/${release.id}`).draft, false);
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `Publicado [${tag}](${releaseUrl}) desde \`${sha}\` con cinco archivos verificados.\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await run(process.argv[2]);
}
