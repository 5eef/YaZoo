import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../app.config.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function config(profile, url) {
  const module = { exports: {} };
  const originalProfile = process.env.EAS_BUILD_PROFILE;
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;
  try {
    if (profile === undefined) delete process.env.EAS_BUILD_PROFILE; else process.env.EAS_BUILD_PROFILE = profile;
    if (url === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = url;
    new Function('require', 'module', 'exports', compiled)(require, module, module.exports);
    return module.exports.default({ config: require('../app.json').expo });
  } finally {
    if (originalProfile === undefined) delete process.env.EAS_BUILD_PROFILE; else process.env.EAS_BUILD_PROFILE = originalProfile;
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = originalUrl;
  }
}
test('distributed builds reject missing, local, credential-bearing and placeholder APIs', () => {
  for (const profile of ['preview', 'production']) {
    for (const url of [undefined, 'not-a-url', 'http://api.example.org', 'https://localhost', 'https://127.0.0.1', 'https://10.0.2.2', 'https://api.example.test', 'https://api.example.org', 'https://172.16.0.1', 'https://169.254.1.1', 'https://api.unit-fixture.dev?token=fixture', 'https://api.unit-fixture.dev#fragment', 'https://user:fixture@api.example.org']) assert.throws(() => config(profile, url));
    assert.doesNotThrow(() => config(profile, 'https://api.unit-fixture.dev'));
  }
  assert.doesNotThrow(() => config(undefined, undefined));
  assert.doesNotThrow(() => config('development', 'http://127.0.0.1:8000'));
});
