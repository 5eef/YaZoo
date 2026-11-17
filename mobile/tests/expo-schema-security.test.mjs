import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url);
const expo = path.dirname(require.resolve('expo/package.json'));
const cli = path.dirname(require.resolve('@expo/cli/package.json', { paths: [expo] }));
const cliRequire = createRequire(path.join(cli, 'package.json'));
const { z } = cliRequire('zod');
const { PluginSchema, DevToolsPluginOutputSchema } = cliRequire('./build/src/start/server/devtools/DevToolsPlugin.schema.js');
const { createMCPDevToolsExtensionSchema } = cliRequire('./build/src/start/server/mcp/createMCPDevToolsExtensionSchema.js');
const { validate } = cliRequire('@expo/schema-utils');

function passes(schema, value) {
  try {
    validate(schema, value);
    return true;
  } catch {
    return false;
  }
}

test('Expo plugin schemas retain valid commands and reject malformed plugin/output data', () => {
  const plugin = { packageName: 'isolated-plugin', packageRoot: '/isolated', cliExtensions: { description: 'Test', entryPoint: 'index.js', commands: [{ name: 'inspect', title: 'Inspect', environments: ['cli', 'mcp'], parameters: [{ name: 'limit', type: 'number' }] }] } };
  assert.equal(passes(PluginSchema, plugin), true);
  assert.equal(passes(PluginSchema, { ...plugin, cliExtensions: { ...plugin.cliExtensions, commands: [] } }), false);
  assert.equal(passes(DevToolsPluginOutputSchema, [{ type: 'text', text: 'Ready', level: 'info' }]), true);
  assert.equal(passes(DevToolsPluginOutputSchema, [{ type: 'audio', url: 'not a URL' }]), false);
  const command = createMCPDevToolsExtensionSchema(plugin, z);
  assert.deepEqual(command.parse({ command: 'inspect', limit: 2 }), { command: 'inspect', limit: 2 });
  assert.equal(command.safeParse({ command: 'inspect', limit: 'two' }).success, false);
  assert.equal(command.safeParse({ command: 'unknown' }).success, false);
  assert.equal(command.safeParse({ command: 'inspect', extra: true }).success, false);
});

test('oversized constrained collections fail before allocating per-element validation errors', () => {
  assert.equal(cliRequire('zod/package.json').version, '4.6.7');
  const result = z.array(z.number()).max(2).safeParse(Array(10000).fill('invalid'));
  assert.equal(result.success, false);
  assert.ok(result.error.issues.length <= 2);
});
