import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const component = process.argv[2];
if (!['frontend','mobile'].includes(component)) throw new Error('Specify frontend or mobile');
const root=path.resolve(import.meta.dirname,'..'); const cwd=path.join(root,component);
function audit(extra=[]){
  // Call npm's JS CLI directly: no shell, reproducible on Windows and Linux.
  const cli=process.env.npm_execpath || (process.platform==='win32' ? path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js') : undefined);
  const result=cli ? spawnSync(process.execPath,[cli,'audit','--json',...extra],{cwd,encoding:'utf8'}) : spawnSync('npm',['audit','--json',...extra],{cwd,encoding:'utf8'});
  if(result.error || ![0,1].includes(result.status))throw new Error('npm audit failed to execute');
  const data=JSON.parse(result.stdout); if(!data.metadata?.vulnerabilities || data.error)throw new Error('npm audit unavailable: fail closed');
  return data;
}
const data=audit();
const allowedIds=new Set(['GHSA-vfj7-8cjw-p6xm',...(component==='mobile'?['GHSA-86w9-cpqp-85rv']:[])]);
const allowedNames=new Set(component==='frontend' ? ['braces','chokidar','fast-glob','micromatch','tailwindcss'] : ['@expo/cli','@expo/code-signing-certificates','@expo/metro','@expo/metro-config','@react-native/community-cli-plugin','@react-native/metro-config','@react-native/virtualized-lists','braces','expo','expo-updates','metro','metro-config','metro-file-map','metro-transform-worker','micromatch','node-forge','react-native','react-native-reanimated','react-native-worklets']);
if(component==='frontend'){
 const runtime=audit(['--omit=dev']);if(runtime.metadata.vulnerabilities.total!==0)throw new Error('Browser runtime advisory: review required');
}else{
 // npm's production tree contains Expo CLI/Metro. Inspect the actual exported
 // Android graph rather than treating every propagated parent as shipped code.
 const maps=[];function visit(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())visit(p);else if(e.name.endsWith('.map'))maps.push(p);}}
 visit(path.join(cwd,'dist'));if(!maps.length)throw new Error('Fresh Android source maps required');
 const sources=maps.flatMap(file=>JSON.parse(fs.readFileSync(file,'utf8')).sources||[]).map(s=>s.replaceAll('\\','/'));
 if(sources.some(s=>/(node-forge|\/braces\/|code-signing-certificates)/.test(s)))throw new Error('Vulnerable tooling reached Android runtime');
 if(!sources.some(s=>s.includes('decode-uri-component-fixed/index.js')) || !sources.some(s=>s.includes('decode-uri-component-compat/index.cjs')))throw new Error('Fixed URI adapter absent from Android graph');
 const config=JSON.parse(fs.readFileSync(path.join(cwd,'app.json'),'utf8')).expo;
 if(config.updates?.codeSigningCertificate)throw new Error('OTA certificate workflow requires node-forge risk review');
 console.log('Android graph: fixed decoder present; braces/node-forge/certificate tooling absent.');
}
for(const [name,v] of Object.entries(data.vulnerabilities)){
 if(!allowedNames.has(name)||v.severity==='critical')throw new Error('New/unreviewed dependency finding: '+name);
 for(const via of v.via){
  if(typeof via==='string'){if(!allowedNames.has(via))throw new Error('Unreviewed dependency chain: '+via);}
  else if(!allowedIds.has(via.url.split('/').at(-1)))throw new Error('New/unreviewed advisory: '+via.url);
 }
 console.log(`${name}: ${v.severity}, ${v.range}, BUILD TOOLING RESIDUAL DOCUMENTED`);
}
console.log(JSON.stringify(data.metadata.vulnerabilities));
console.log(data.metadata.vulnerabilities.total ? 'RUNTIME SECURITY PASS; npm audit remains non-zero; tooling residual documented in docs/DEPENDENCY_SECURITY_AFWAJ_2026.md' : 'RUNTIME SECURITY PASS; npm audit PASS');
