import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { contactKey, open, seal } from '../../functions/person-contacts/crypto.ts';

test('AES-GCM round-trip, unique nonces, wrong key and modified ciphertext', async () => {
  const key = await contactKey(randomBytes(32).toString('base64'));
  const other = await contactKey(randomBytes(32).toString('base64'));
  const contact = { phone: '+1 202 555 0100', mobile: null };
  const first = await seal(key, contact, 'person-1');
  const second = await seal(key, contact, 'person-1');
  assert.notEqual(first.iv, second.iv);
  assert.deepEqual(await open(key, first), contact);
  await assert.rejects(open(other, first));
  await assert.rejects(open(key, { ...first, binding: 'person-2' }));
  const modified = Buffer.from(first.data, 'base64');
  modified[0] ^= 1;
  await assert.rejects(open(key, { ...first, data: modified.toString('base64') }));
});

test('HTTP handler uses verified identity, keeps plaintext out of database requests, and decrypts authorized results', async t => {
  const values = { SUPABASE_URL: 'https://supabase.invalid', SUPABASE_ANON_KEY: 'test-public',
    SUPABASE_SERVICE_ROLE_KEY: 'test-server', PERSON_CONTACT_KEY_V1: randomBytes(32).toString('base64') };
  let handler, stored, permitted = true;
  globalThis.Deno = { env: { get: name => values[name] }, serve: fn => { handler = fn; } };
  t.after(() => { delete globalThis.Deno; });
  const expected = {phone:'+1 202 555 0101',mobile:'+1 202 555 0102'};
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    if (url.endsWith('/auth/v1/user')) return Response.json({id:'test-actor'});
    const body = JSON.parse(init.body);
    assert.equal(body.p_actor,'test-actor');
    assert.ok(!init.body.includes(expected.phone) && !init.body.includes(expected.mobile));
    if (url.endsWith('/stage_person_contacts')) {
      stored = body.p_items[0];
      return new Response(null,{status:204});
    }
    assert.ok(url.endsWith('/read_person_contacts'));
    return Response.json(permitted ? [{person_id:10,envelope:stored.envelope}] : []);
  });
  await import('../../functions/person-contacts/index.ts');
  const invoke = async (body, authenticated=true) => handler(new Request('https://example.invalid', {
    method:'POST', headers: authenticated ? {Authorization:'Bearer test-user'} : {}, body:JSON.stringify(body)
  }));
  const request = {action:'read',ids:[10],actor:'ignored'};
  assert.equal((await invoke(request,false)).status,401);
  const prepared = await invoke({action:'prepare',items:[{id:10,...expected}]});
  assert.equal(prepared.status,200);
  assert.deepEqual((await prepared.json()).tickets,[stored.ticket]);
  const result = await invoke(request);
  assert.equal(result.headers.get('cache-control'),'no-store');
  assert.deepEqual(await result.json(), { contacts:[{id:10,...expected}] });
  const demo = {action:'read', ids:[-1030001], community:-1030000, mode:'ficha'};
  permitted=false;
  const demoResult = await invoke(demo);
  assert.equal(demoResult.status,200);
  assert.deepEqual(await demoResult.json(), {contacts:[]});
  assert.equal((await invoke({...demo, ids:[0]})).status,400);
  assert.deepEqual(await (await invoke(request)).json(), {contacts:[]});
  assert.equal((await invoke({...request,mode:'todo'})).status,400);
});
