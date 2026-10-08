import assert from 'node:assert/strict';
import test from 'node:test';
import { errorKey, normalizeBaseUrl } from '../src/api/errors.ts';
import { dictionaries } from '../src/i18n/messages.ts';
test('API URL normalizes and rejects credentials or unsafe schemes', () => {
  assert.equal(normalizeBaseUrl('https://example.test/'), 'https://example.test/api');
  assert.equal(normalizeBaseUrl('https://example.test/api/'), 'https://example.test/api');
  assert.throws(() => normalizeBaseUrl('https://user:secret@example.test'));
  assert.throws(() => normalizeBaseUrl('file:///tmp/api'));
});
test('API failures distinguish offline, revoked auth, validation, limits and backend', () => {
  assert.equal(errorKey(0), 'offline'); assert.equal(errorKey(401), 'expired'); assert.equal(errorKey(419), 'forbidden'); assert.equal(errorKey(422), 'validation'); assert.equal(errorKey(429), 'limited'); assert.equal(errorKey(503), 'unavailable');
});
test('all product messages have FR AR EN translations', () => {
  const keys = Object.keys(dictionaries.fr).sort();
  for (const locale of ['ar', 'en']) { assert.deepEqual(Object.keys(dictionaries[locale]).sort(), keys); assert.ok(Object.values(dictionaries[locale]).every(value => value.trim())); }
});
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/api/client.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace("'./errors'", JSON.stringify(new URL('../src/api/errors.ts', import.meta.url).href));
const client = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('media Bearer headers stay on the configured API media origin', () => {
  client.configureSession('test-only-media-token', () => {});
  try {
    assert.equal(client.mediaHeaders(`${client.baseUrl}/media/private/test`).Authorization, 'Bearer test-only-media-token');
    assert.equal(client.mediaHeaders('https://cdn.example.test/image.png'), undefined);
    assert.equal(client.mediaHeaders(`${new URL(client.baseUrl).origin}/storage/image.png`), undefined);
  } finally { client.configureSession(null, () => {}); }
});
test('native requests use Bearer without cookies and revoke session only on authenticated 401', async () => {
  const original = globalThis.fetch;
  let revoked = 0;
  client.configureSession('test-only-native-token', () => { revoked++; });
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.credentials, 'omit');
      assert.equal(options.headers.Authorization, 'Bearer test-only-native-token');
      assert.equal(options.headers['Accept-Language'], 'ar');
      return new Response(JSON.stringify({ errors: { reason: ['required'] } }), { status: 422 });
    };
    await assert.rejects(client.api('/test', 'ar', 'POST', {}), error => error.status === 422 && error.fields.reason[0] === 'required');
    assert.equal(revoked, 0);
    globalThis.fetch = async () => new Response('{}', { status: 401 });
    await assert.rejects(client.api('/test', 'en'), error => error.status === 401);
    assert.equal(revoked, 1);
    client.configureSession(null, () => { revoked++; });
    await assert.rejects(client.api('/test', 'fr'), error => error.status === 401);
    assert.equal(revoked, 1);
    globalThis.fetch = async () => { throw new TypeError('network unavailable'); };
    await assert.rejects(client.api('/test', 'fr'), error => error.status === 0);
  } finally { globalThis.fetch = original; client.configureSession(null, () => {}); }
});
