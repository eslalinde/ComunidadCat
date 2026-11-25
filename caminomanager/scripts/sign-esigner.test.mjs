import assert from 'node:assert/strict';
import { test } from 'node:test';
import childProcess from 'node:child_process';
import { sign } from './sign-esigner.mjs';

test('calls the cloud signing tool using environment references and propagates errors', (t) => {
  const file = 'C:\\build output\\ComunidadCat.exe';
  const settings = {
    JSIGN_JAR: 'C:\\tools\\jsign.jar',
    ESIGNER_CREDENTIAL_ID: 'example-credential',
    ESIGNER_ACCOUNT: 'example-user|example-password',
    ESIGNER_TOTP_SECRET: 'example-seed',
  };
  const original = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]]));
  Object.assign(process.env, settings);
  let calls = 0;
  let failure = false;
  t.mock.method(childProcess, 'execFileSync', (command, args) => {
    calls++;
    assert.equal(command, 'java');
    assert.equal(args.at(-1), file);
    assert.ok(args.includes('RFC3161') && args.includes('SHA-256'));
    assert.ok(args.includes('env:ESIGNER_ACCOUNT') && args.includes('env:ESIGNER_TOTP_SECRET'));
    assert.ok(!args.includes(settings.ESIGNER_ACCOUNT) && !args.includes(settings.ESIGNER_TOTP_SECRET));
    if (failure) throw Object.assign(new Error(settings.ESIGNER_TOTP_SECRET), { status: 1 });
  });
  try {
    sign({ path: file, hash: 'sha256' });
    failure = true;
    assert.throws(() => sign({ path: file, hash: 'sha256' }), error =>
      error.message.includes('código 1') && !error.message.includes(settings.ESIGNER_TOTP_SECRET));
    assert.throws(() => sign({ path: file, hash: 'sha1' }), /SHA-256/);
    delete process.env.ESIGNER_ACCOUNT;
    assert.throws(() => sign({ path: file, hash: 'sha256' }), /Falta ESIGNER_ACCOUNT/);
    assert.equal(calls, 2);
  } finally {
    for (const [name, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
