import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url);
const expo = path.dirname(require.resolve('expo/package.json'));
const cli = path.dirname(require.resolve('@expo/cli/package.json', { paths: [expo] }));
const cliRequire = createRequire(path.join(cli, 'package.json'));
const { z } = cliRequire('zod');
const { PluginSchema, DevToolsPluginOutputSchema } = cliRequire('./build/src/start/server/DevToolsPlugin.schema.js');
const { createMCPDevToolsExtensionSchema } = cliRequire('./build/src/start/server/createMCPDevToolsExtensionSchema.js');

test('Expo plugin schemas retain valid commands and reject malformed plugin/output data', () => {
  const plugin = { packageName: 'isolated-plugin', packageRoot: '/isolated', cliExtensions: { description: 'Test', entryPoint: 'index.js', commands: [{ name: 'inspect', title: 'Inspect', environments: ['cli', 'mcp'], parameters: [{ name: 'limit', type: 'number' }] }] } };
  assert.equal(PluginSchema.safeParse(plugin).success, true);
  assert.equal(PluginSchema.safeParse({ ...plugin, cliExtensions: { ...plugin.cliExtensions, commands: [] } }).success, false);
  assert.equal(DevToolsPluginOutputSchema.safeParse([{ type: 'text', text: 'Ready', level: 'info' }]).success, true);
  assert.equal(DevToolsPluginOutputSchema.safeParse([{ type: 'audio', url: 'not a URL' }]).success, false);
  const command = createMCPDevToolsExtensionSchema(plugin);
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
