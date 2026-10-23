import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
const root=path.resolve(import.meta.dirname,'../..');
function policy(mode){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'yazoo-audit-test-'));const cli=path.join(dir,'npm-fixture.cjs');
 fs.writeFileSync(cli,`const runtime=process.argv.includes('--omit=dev');const mode=process.env.YAZOO_AUDIT_TEST_MODE;if(mode==='unavailable'||(runtime&&mode==='clean'))process.exit(2);const affected=mode==='clean'?false:mode==='runtime'||!runtime; const known=mode==='known';const pkg=known?'braces':'unreviewed-package';console.log(JSON.stringify({metadata:{vulnerabilities:{total:affected?1:0}},vulnerabilities:affected?{[pkg]:{severity:'high',range:'1.0.0',via:[{url:'https://github.com/advisories/'+(known?'GHSA-vfj7-8cjw-p6xm':'GHSA-new-advisory')}]}}:{}}));process.exit(affected?1:0);`);
 try{return spawnSync(process.execPath,[path.join(root,'scripts/audit-dependency-policy.mjs'),'frontend'],{encoding:'utf8',env:{...process.env,npm_execpath:cli,YAZOO_AUDIT_TEST_MODE:mode}});}
 finally{fs.unlinkSync(cli);fs.rmdirSync(dir);}
}
test('dependency gate refuses new advisories and runtime exposure',()=>{
 assert.notEqual(policy('unknown').status,0);assert.notEqual(policy('runtime').status,0);
});
test('reviewed tooling remains visible and is not called npm PASS',()=>{
 const result=policy('known');assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/npm audit remains non-zero/);assert.match(result.stdout,/braces: high/);
});

test('a clean complete-tree audit needs no second endpoint; unavailable audits still fail',()=>{
 const result=policy('clean');assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/npm audit PASS/);
 assert.notEqual(policy('unavailable').status,0);
});
