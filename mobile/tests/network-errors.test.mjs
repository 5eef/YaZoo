import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/api/client.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace("'./errors'", JSON.stringify(new URL('../src/api/errors.ts', import.meta.url).href));
const client = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('demo cold start preserves public code and Retry-After without replaying POST', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async () => {
      calls++;
      return new Response(JSON.stringify({ code: 'DEMO_BACKEND_WAKING', message: 'upstream private diagnostic' }), { status: 503, headers: { 'Retry-After': '4' } });
    };
    await assert.rejects(client.api('/auth/mobile/login', 'fr', 'POST', {}), error => {
      assert.equal(error.code, 'DEMO_BACKEND_WAKING');
      assert.equal(error.retryAfter, 4);
      assert.ok(!error.message.includes('private diagnostic'));
      return error.status === 503;
    });
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});

test('malformed successful responses fail safely and unsuccessful responses preserve their status', async () => {
  const original = globalThis.fetch;
  try {
    for (const body of ['<html>proxy failure</html>', 'null', '42', '"unexpected"']) {
      globalThis.fetch = async () => new Response(body);
      await assert.rejects(client.api('/test', 'fr'), error => error.status === 502);
    }
    for (const status of [403, 404, 409, 419, 422, 429, 500, 503]) {
      globalThis.fetch = async () => new Response('null', { status });
      await assert.rejects(client.api('/test', 'fr'), error => error.status === status);
    }
    globalThis.fetch = async () => new Response(null, { status: 204 });
    assert.deepEqual(await client.api('/test', 'fr', 'DELETE'), {});
    let calls = 0;
    globalThis.fetch = async () => { calls++; throw new TypeError('offline'); };
    await assert.rejects(client.api('/test', 'fr', 'POST', {}), error => error.status === 0);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});

test('malformed media URLs and credential-bearing URLs never receive a Bearer token', () => {
  client.configureSession('test-only', () => {});
  try {
    for (const uri of ['not a URL', '/relative', 'file:///tmp/movie', client.baseUrl.replace('://', '://user:pass@') + '/media/test']) assert.equal(client.mediaHeaders(uri), undefined);
  } finally { client.configureSession(null, () => {}); }
});
