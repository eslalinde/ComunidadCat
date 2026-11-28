import assert from 'node:assert/strict';
import test from 'node:test';
import { assetNames, checkReleaseHistory, releaseVersion, verifyAssets } from './release.mjs';

const version = '1.0.0';
const lock = { version, packages: { '': { version } } };

test('publishes only stable versions in sync with both lockfile entries', () => {
  assert.equal(releaseVersion({ version }, lock), version);
  for (const invalid of ['v1.0.0', '1.0.0-beta.2', '01.0.0', '1.0', '1.0.1']) {
    assert.throws(() => releaseVersion({ version: invalid }, lock));
  }
  assert.throws(() => releaseVersion({ version }, { ...lock, packages: { '': { version: '0.1.0' } } }));
});

const hashes = Object.fromEntries(assetNames("1.0.1").map(name => [name, 'sha256:' + 'a'.repeat(64)]));
const assets = Object.entries(hashes).map(([name, digest]) => ({ name, digest, size: 10, state: 'uploaded' }));

test('accepts the complete signed candidate in any upload order', () => {
  verifyAssets([...assets].reverse(), hashes, '1.0.1');
});

test('blocks incomplete, replaced or extra downloads before publication or retry', () => {
  for (const change of [{ digest: 'sha256:' + 'b'.repeat(64) }, { size: 0 }, { state: 'new' }]) {
    assert.throws(() => verifyAssets([{ ...assets[0], ...change }, ...assets.slice(1)], hashes, '1.0.1'));
  }
  assert.throws(() => verifyAssets(assets.slice(1), hashes, '1.0.1'));
  assert.throws(() => verifyAssets([...assets, assets[0]], hashes, '1.0.1'));
  assert.throws(() => verifyAssets(assets, {}, '1.0.1'));
});

test('web release requires zero attachments', () => {
  verifyAssets([], {}, version);
  assert.throws(() => verifyAssets(assets, hashes, version));
});

test('resumes the exact draft or published release and rejects a conflicting SHA', () => {
  const sha = 'a'.repeat(40);
  for (const draft of [true, false]) {
    const release = { tag_name: 'web-v1.0.0', target_commitish: sha, prerelease: false, draft };
    assert.equal(checkReleaseHistory([release], version, sha), release);
    assert.throws(() => checkReleaseHistory([release], version, 'b'.repeat(40)));
  }
});

test('prevents downgrades and ignores earlier prereleases when preparing the stable release', () => {
  const previous = { tag_name: 'v1.0.0-beta.1', prerelease: true, draft: false };
  assert.equal(checkReleaseHistory([previous], version, 'sha'), undefined);
  assert.throws(() => checkReleaseHistory([{ tag_name: 'v1.10.0', draft: false }], '1.9.0', 'sha'));
});
