import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
test('xcode generates unique project identifiers without the obsolete uuid dependency', () => {
  const xcode = require('xcode');
  const project = xcode.project('qa-only.xcodeproj');
  project.hash = { project: { objects: {} } };
  const identifiers = new Set(Array.from({ length: 1000 }, () => project.generateUuid()));
  assert.equal(identifiers.size, 1000);
  for (const id of identifiers) assert.match(id, /^[A-F0-9]{24}$/);
  const xcodeRequire = createRequire(require.resolve('xcode'));
  // Expo now resolves xcode 4, which uses Node's crypto.randomUUID. Resolve
  // its own metadata rather than accidentally finding a parent checkout's uuid.
  const metadata = xcodeRequire('./package.json');
  assert.equal(Number(metadata.version.split('.')[0]), 4);
  assert.equal(Object.hasOwn(metadata.dependencies, 'uuid'), false);
});
