import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/api/client.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace("'./errors'", JSON.stringify(new URL('../src/api/errors.ts', import.meta.url).href));
const client = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('multipart preserves the native boundary and omits cookies', async () => {
 const original = globalThis.fetch;
 const body = new FormData(); body.append('content', 'QA only');
 try { globalThis.fetch = async (_, options) => { assert.equal(options.body, body); assert.equal(options.headers['Content-Type'], undefined); assert.equal(options.credentials, 'omit'); return new Response('{}'); }; await client.api('/posts', 'fr', 'POST', body); }
 finally { globalThis.fetch = original; }
});
test('an in-flight response cannot restore private data after logout or account switch', async () => {
 const original = globalThis.fetch;
 let deliver;
 try { client.configureSession('test-account-one', () => {}); globalThis.fetch = () => new Promise(resolve => { deliver = resolve; }); const request = client.api('/users/me', 'fr'); client.configureSession(null, () => {}); deliver(new Response('{"data":{"name":"private test value"}}')); await assert.rejects(request, error => error.status === 401); }
 finally { globalThis.fetch = original; client.configureSession(null, () => {}); }
});

test('a response from a previous session stays obsolete when the same token is restored', async () => {
 const original = globalThis.fetch;
 let deliver;
 try {
  client.configureSession('test-account-one', () => {});
  globalThis.fetch = () => new Promise(resolve => { deliver = resolve; });
  const request = client.api('/conversations', 'fr');
  client.configureSession(null, () => {});
  client.configureSession('test-account-one', () => {});
  deliver(new Response('{"data":[{"body":"obsolete private message"}]}'));
  await assert.rejects(request, error => error.status === 401);
 } finally { globalThis.fetch = original; client.configureSession(null, () => {}); }
});

test('an anonymous login response cannot replace a subsequently configured account', async () => {
 const original = globalThis.fetch;
 let deliver;
 try {
  client.configureSession(null, () => {});
  globalThis.fetch = () => new Promise(resolve => { deliver = resolve; });
  const request = client.api('/auth/mobile/login', 'fr', 'POST', {});
  client.configureSession('test-account-two', () => {});
  deliver(new Response('{"token":"obsolete-account-one"}'));
  await assert.rejects(request, error => error.status === 401);
 } finally { globalThis.fetch = original; client.configureSession(null, () => {}); }
});

test('private channel authentication expires only the current rejected session', async () => {
 const original = globalThis.fetch;
 let invalidations = 0;
 try {
  client.configureSession('expired-test-token', () => { invalidations++; });
  globalThis.fetch = async () => new Response('{}', { status: 401 });
  await assert.rejects(client.authorizeBroadcast('123.456', 'private-users.1'), error => error.status === 401);
  assert.equal(invalidations, 1);
  client.configureSession('valid-test-token', () => { invalidations++; });
  globalThis.fetch = async () => new Response('{}', { status: 403 });
  await assert.rejects(client.authorizeBroadcast('123.456', 'private-users.2'), error => error.status === 403);
  assert.equal(invalidations, 1);
 } finally { globalThis.fetch = original; client.configureSession(null, () => {}); }
});

test('a late broadcast 401 cannot expire the account that replaced its session', async () => {
 const original = globalThis.fetch;
 let deliver;
 let invalidations = 0;
 try {
  client.configureSession('test-account-one', () => assert.fail('obsolete callback'));
  globalThis.fetch = () => new Promise(resolve => { deliver = resolve; });
  const request = client.authorizeBroadcast('123.456', 'private-users.1');
  client.configureSession('test-account-two', () => { invalidations++; });
  deliver(new Response('{}', { status: 401 }));
  await assert.rejects(request, error => error.status === 401);
  assert.equal(invalidations, 0);
 } finally { globalThis.fetch = original; client.configureSession(null, () => {}); }
});

test('a confirmed authenticated 401 expires the session even when its response body cannot be read', async () => {
 const original = globalThis.fetch;
 let invalidations = 0;
 try {
  client.configureSession('expired-test-token', () => { invalidations++; });
  globalThis.fetch = async () => new Response(new ReadableStream({
   start(controller) { controller.error(new TypeError('connection lost after response headers')); },
  }), { status: 401 });
  await assert.rejects(client.api('/conversations', 'fr'), error => error.status === 401);
  assert.equal(invalidations, 1);
 } finally { globalThis.fetch = original; client.configureSession(null, () => {}); }
});
