import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { ApiError, failureKey, normalizeBaseUrl } from '../src/api/errors.ts';
const source = await readFile(new URL('../src/api/client.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace("'./errors'", JSON.stringify(new URL('../src/api/errors.ts', import.meta.url).href));
const client = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('distributed API normalization rejects a double api prefix', () => {
  assert.equal(normalizeBaseUrl('https://yazoo-showcase.pages.dev/api/'), 'https://yazoo-showcase.pages.dev/api');
  assert.throws(() => normalizeBaseUrl('https://yazoo-showcase.pages.dev/api/api'), /single \/api prefix/);
});

test('HTTP, local exceptions, offline and timeout have distinct user messages', () => {
  for (const [status, key, category] of [[401,'expired','AUTH_ERROR'],[403,'forbidden','FORBIDDEN'],[404,'notFound','NOT_FOUND'],[422,'validation','VALIDATION_ERROR'],[500,'unavailable','SERVER_ERROR'],[0,'offline','NETWORK_ERROR']]) {
    const error = new ApiError(status); assert.equal(failureKey(error),key); assert.equal(error.category,category);
  }
  assert.equal(failureKey(new TypeError('local UI failure')), 'unexpected');
  assert.equal(failureKey(new ApiError(0, {}, 'REQUEST_TIMEOUT')), 'timeout');
  assert.equal(new ApiError(0, {}, 'REQUEST_TIMEOUT').category, 'TIMEOUT');
  assert.equal(failureKey(new ApiError(409)), 'conflict');
  assert.equal(failureKey(new ApiError(502, {}, 'INVALID_RESPONSE')), 'invalidResponse');
  assert.equal(new ApiError(500, {}, 'CLIENT_ERROR').category, 'CLIENT_ERROR');
});

test('authenticated CRUD uses Cloudflare once per mutation and rejects duplicate api paths', async () => {
  const original = globalThis.fetch; const calls = [];
  client.configureSession('test-only-crud', () => {});
  try {
    globalThis.fetch = async (url, options) => { calls.push(options.method); assert.equal(url,'https://yazoo-showcase.pages.dev/api/posts/123'); assert.equal(options.headers.Authorization,'Bearer test-only-crud'); return new Response('{}'); };
    for (const method of ['POST','PATCH','PUT','DELETE']) await client.api('/posts/123','fr',method,{content:'test'});
    assert.deepEqual(calls,['POST','PATCH','PUT','DELETE']);
    await assert.rejects(client.api('/api/posts','fr'), e=>e.status===400);
    const circular={};circular.self=circular;
    await assert.rejects(client.api('/posts','fr','POST',circular),e=>e.status===500&&failureKey(e)==='unexpected');
    assert.equal(calls.length,4);
  } finally { globalThis.fetch=original; client.configureSession(null,()=>{}); }
});

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

test('showcase upload refusal preserves its public cause and is never reported as offline', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'showcase.uploads_disabled' }), { status: 409 });
    const form = new FormData();
    form.append('_method', 'PATCH');
    form.append('avatar_file', new Blob(['QA'], { type: 'image/png' }), 'qa.png');
    await assert.rejects(client.api('/users/2', 'fr', 'POST', form), error => {
      assert.equal(error.code, 'SHOWCASE_UPLOADS_DISABLED');
      assert.equal(failureKey(error), 'demoUploadsDisabled');
      return error.status === 409;
    });
  } finally { globalThis.fetch = original; }
});

test('malformed media URLs and credential-bearing URLs never receive a Bearer token', () => {
  client.configureSession('test-only', () => {});
  try {
    for (const uri of ['not a URL', '/relative', 'file:///tmp/movie', client.baseUrl.replace('://', '://user:pass@') + '/media/test']) assert.equal(client.mediaHeaders(uri), undefined);
  } finally { client.configureSession(null, () => {}); }
});

test('showcase upload denial and storage failure are never offline errors', () => {
  const denied = new ApiError(409, {}, 'SHOWCASE_UPLOADS_DISABLED');
  assert.equal(denied.category, 'SHOWCASE_UPLOADS_DISABLED');
  assert.equal(failureKey(denied), 'demoUploadsDisabled');
  assert.equal(new ApiError(500).category, 'SERVER_ERROR');
});

test('logout acknowledgement survives detachment without restoring private response data', async () => {
  const original = globalThis.fetch;
  let deliver;
  try {
    client.configureSession('fictional-logout-token', () => assert.fail('already signed out'));
    globalThis.fetch = (_, options) => {
      assert.equal(options.headers.Authorization, 'Bearer fictional-logout-token');
      return new Promise(resolve => { deliver = resolve; });
    };
    const request = client.api('/auth/logout', 'fr', 'POST');
    client.configureSession(null, () => {});
    deliver(new Response('{"message":"signed out"}'));
    assert.deepEqual(await request, {});
    assert.equal(client.mediaHeaders(client.baseUrl + '/media/test'), undefined);
  } finally { globalThis.fetch = original; client.configureSession(null, () => {}); }
});

test('malformed validation fields cannot crash the login form', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ errors: { email: 'broken', password: [42], name: ['Valid test message'] } }), { status: 422 });
    await assert.rejects(client.api('/auth/mobile/login', 'fr', 'POST', {}), error => {
      assert.deepEqual(error.fields, { name: ['Valid test message'] });
      return error.status === 422;
    });
  } finally { globalThis.fetch = original; }
});
