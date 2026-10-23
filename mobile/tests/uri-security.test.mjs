import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Worker } from 'node:worker_threads';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
const require = createRequire(import.meta.url);
const queryString = require('query-string');
test('fixed decoder adapter preserves query-string Unicode and arrays', () => {
  assert.deepEqual({...queryString.parse('q=F%C3%A8s&ar=%D9%81%D8%A7%D8%B3&tag=a&tag=b')}, {ar:'فاس',q:'Fès',tag:['a','b']});
  assert.equal(JSON.parse(readFileSync(join(dirname(require.resolve('decode-uri-component-fixed')), 'package.json'),'utf8')).version, '0.5.0');
});
test('malformed percent-encoded input completes without exponential decoding', async () => {
  const worker = new Worker(`const {parentPort,workerData}=require('node:worker_threads');const parse=require(workerData.modulePath).parse;parentPort.postMessage(parse('q='+('%FE%FF%C0'.repeat(10000))).q.length);`, {eval:true,workerData:{modulePath:require.resolve('query-string')}});
  let timer;
  try {
    const length = await new Promise((resolve,reject) => {
      timer=setTimeout(()=>reject(new Error('URI decoding exceeded 3 seconds')),3000);
      worker.once('message',resolve);worker.once('error',reject);
    });
    assert.ok(length>0);
  } finally { clearTimeout(timer); await worker.terminate(); }
});
