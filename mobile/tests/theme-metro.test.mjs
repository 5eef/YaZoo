import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { themes, resolveTheme } from '../src/theme/tokens.ts';
const require = createRequire(import.meta.url);
const config = require('../metro.config.js');
const root = join(import.meta.dirname, '..');
const blocked = path => config.resolver.blockList.some(rule => rule.test(path));
test('Metro excludes CNG build output without excluding dependency distribution code', () => {
 for (const path of ['android/app/build/generated/index.js', 'android/.gradle/state.bin', 'android/app/.cxx/Debug/files.json', 'dist/metadata.json', 'coverage/result.json']) assert.ok(blocked(join(root,path)), path);
 assert.equal(blocked(join(root,'node_modules/expo-router/build/index.js')),false);
 assert.equal(blocked(join(root,'node_modules/some-package/dist/index.js')),false);
 assert.equal(blocked(join(root,'src/features/social/useSocial.tsx')),false);
});
const lum = hex => { const c = hex.slice(1).match(/../g).map(v => parseInt(v,16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4); return c[0]*.2126+c[1]*.7152+c[2]*.0722; };
test('light/dark body, secondary and error text retain readable contrast', () => {
 for (const theme of Object.values(themes)) for (const text of [theme.text,theme.secondary,theme.danger]) for (const bg of [theme.page,theme.surface,theme.form]) { const a=lum(text),b=lum(bg); assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5); }
 assert.equal(resolveTheme('system','dark'),'dark'); assert.equal(resolveTheme('light','dark'),'light'); assert.equal(resolveTheme('system',null),'light');
});
