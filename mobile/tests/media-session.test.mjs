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
