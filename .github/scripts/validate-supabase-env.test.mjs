import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./validate-supabase-env.mjs', import.meta.url));
const valid = {
  SUPABASE_PROJECT_ID: 'abcdefghijklmnopqrst',
  SUPABASE_ACCESS_TOKEN: 'sbp_synthetic_test_value',
  SUPABASE_DB_PASSWORD: 'synthetic-password-with-$-and-spaces ',
};
function check(overrides) {
  const result = spawnSync(process.execPath, [script], {
    env: { ...process.env, ...valid, ...overrides }, encoding: 'utf8',
  });
  assert.ifError(result.error);
  return { status: result.status, output: result.stdout + result.stderr };
}

test('accepts a classic token without printing credentials', () => {
  assert.deepEqual(check({}), { status: 0, output: '' });
});
test('accepts a scoped token without assuming a fixed token length', () => {
  assert.deepEqual(check({ SUPABASE_ACCESS_TOKEN: 'sbp_fc_synthetic_scoped_value' }), { status: 0, output: '' });
});
for (const name of Object.keys(valid)) {
  for (const value of ['', ' \n ']) {
    test(`rejects missing/blank ${name}: ${JSON.stringify(value)}`, () => {
      const result = check({ [name]: value });
      assert.equal(result.status, 1);
      assert.match(result.output, new RegExp(name));
      for (const secret of Object.values(valid)) assert.ok(!result.output.includes(secret));
    });
  }
}
for (const token of ['sb_publishable_wrong_key', 'sb_secret_wrong_key', 'eyJhbGciOi.synthetic.jwt', 'sbp_', ' sbp_synthetic', 'sbp_synthetic\n', 'sbp_syn thetic']) {
  test(`rejects invalid token ${JSON.stringify(token)} without exposing it`, () => {
    const result = check({ SUPABASE_ACCESS_TOKEN: token });
    assert.equal(result.status, 1);
    assert.match(result.output, /personal access token/);
    // The diagnostic explains the public prefix, but never prints the supplied value.
    if (token !== 'sbp_') assert.ok(!result.output.includes(token));
  });
}
for (const project of ['https://example.supabase.co', 'UPPERCASEPROJECTREFXX', ' abcdefghijklmnopqrst', 'short']) {
  test(`rejects invalid project ref ${JSON.stringify(project)}`, () => {
    const result = check({ SUPABASE_PROJECT_ID: project });
    assert.equal(result.status, 1);
    assert.match(result.output, /identificador del proyecto/);
    assert.ok(!result.output.includes(project));
  });
}
