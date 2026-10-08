import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
test('xcode continues generating unique project identifiers with patched CommonJS uuid', () => {
  const xcode = require('xcode');
  const project = xcode.project('qa-only.xcodeproj');
  project.hash = { project: { objects: {} } };
  const identifiers = new Set(Array.from({ length: 1000 }, () => project.generateUuid()));
  assert.equal(identifiers.size, 1000);
  for (const id of identifiers) assert.match(id, /^[A-F0-9]{24}$/);
  const xcodeRequire = createRequire(require.resolve('xcode'));
  assert.equal(xcodeRequire('uuid/package.json').version, '11.1.1');
});
