import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ci=read('.github/workflows/ci.yml'),mobile=read('.github/workflows/mobile.yml'),codeql=read('.github/workflows/codeql.yml');
assert.match(ci,/uses: \.\/\.github\/workflows\/mobile\.yml/);
assert.match(ci,/audit-dependency-policy\.mjs frontend/);
assert.match(mobile,/audit-dependency-policy\.mjs mobile/);
assert.match(mobile,/expo export --platform android --source-maps/);
assert.match(codeql,/languages: javascript-typescript/);
for(const text of [ci,mobile,codeql]){
 assert.doesNotMatch(text,/pull_request_target|continue-on-error:\s*true|\|\|\s*true/);
 for(const line of text.split('\n').filter(l=>/uses:/.test(l))){const value=line.split('uses:')[1].trim().split(/\s/)[0];assert.ok(value.startsWith('./')||/@[a-f0-9]{40}$/.test(value),value);}
}
const eas=JSON.parse(read('mobile/eas.json'));assert.equal(eas.build.production.credentialsSource,'remote');assert.equal(eas.build.production.android.buildType,'app-bundle');
assert.ok(JSON.parse(read('mobile/app.json')).expo.plugins.includes('./plugins/with-release-signing'));
assert.match(read('mobile/plugins/with-release-signing.js'),/debug fallback is forbidden/);
assert.match(read('.gitleaks.toml'),/regexTarget = "secret"/);
console.log('startup-release-guards=PASS');
