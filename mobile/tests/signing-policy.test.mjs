import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
const require=createRequire(import.meta.url);
const {applySigningGuard}=require('../plugins/with-release-signing');
test('CNG signing transformation preserves debug and removes release fallback',()=>{
 const source='android { buildTypes { debug { signingConfig signingConfigs.debug } release { signingConfig signingConfigs.debug } } }';
 const result=applySigningGuard(source);
 assert.match(result,/debug \{ signingConfig signingConfigs\.debug/);
 assert.match(result,/release \{\s*signingConfig null/);
 assert.equal(applySigningGuard(result),result);
 assert.match(result, /taskGraph\.allTasks\.any/);
 assert.doesNotMatch(result, /startParameter\.taskNames/);
 assert.throws(()=>applySigningGuard('unknown template'));
});
