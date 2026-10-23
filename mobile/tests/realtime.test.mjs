import assert from 'node:assert/strict';
import test from 'node:test';
import { connectRealtime } from '../src/api/realtime.ts';

test('malformed remote connection identifiers never reach private authorization', async () => {
  const original = globalThis.WebSocket;
  const sockets = [];
  let authorizations = 0;
  class Socket {
    readyState = 1;
    closed = false;
    constructor() { sockets.push(this); }
    send() {}
    close() { this.closed = true; this.onclose?.(); }
  }
  globalThis.WebSocket = Socket;
  try {
    for (const socket_id of [null, {}, 'invalid', '123', `${'1'.repeat(21)}.2`]) {
      const stop = connectRealtime({ url: 'wss://fixture.test', channels: ['private-users.1'], authorize: async () => { authorizations++; return { auth: 'fixture' }; }, receive: () => {}, status: () => {}, resync: () => {} });
      const socket = sockets.at(-1);
      await socket.onmessage({ data: JSON.stringify({ event: 'pusher:connection_established', data: { socket_id } }) });
      assert.equal(socket.closed, true);
      stop();
    }
    assert.equal(authorizations, 0);
  } finally { globalThis.WebSocket = original; }
});

test('private events require subscription acknowledgement; cleanup rejects late auth and closes transport', async () => {
  const original = globalThis.WebSocket;
  const received = [], statuses = [], sockets = [];
  class Socket {
    readyState = 1; sent = []; closed = false;
    constructor(url) { this.url = url; sockets.push(this); }
    send(raw) { this.sent.push(JSON.parse(raw)); }
    close() { this.closed = true; this.onclose?.(); }
    frame(event, data, channel) { return this.onmessage?.({data:JSON.stringify({event,data:JSON.stringify(data),channel})}); }
  }
  globalThis.WebSocket = Socket;
  let finishAuth;
  try {
    const stop = connectRealtime({url:'wss://fixture.test/app/key',channels:['private-users.1'],authorize:async()=>({auth:'fixture'}),receive:e=>received.push(e),status:s=>statuses.push(s),resync:()=>{}});
    const ws = sockets[0];
    await ws.frame('notification.created', {id:1}, 'private-users.1');
    assert.equal(received.length,0);
    await ws.frame('pusher:connection_established',{socket_id:'123.456'});
    assert.equal(ws.sent[0].event,'pusher:subscribe');
    await ws.frame('pusher_internal:subscription_succeeded',{},'private-users.1');
    assert.equal(statuses.at(-1),true);
    await ws.frame('notification.created',{id:1},'private-users.2');
    assert.equal(received.length,0);
    await ws.frame('notification.created',{id:1},'private-users.1');
    assert.equal(received.length,1);
    stop();
    assert.equal(ws.closed,true);
    await ws.frame('notification.created',{id:2},'private-users.1');
    assert.equal(received.length,1);
    const stopPending = connectRealtime({url:'wss://fixture.test',channels:['private-users.1'],authorize:()=>new Promise(resolve=>{finishAuth=resolve;}),receive:()=>{},status:()=>{},resync:()=>{}});
    const pending = sockets[1].frame('pusher:connection_established',{socket_id:'222.333'});
    stopPending();
    finishAuth({auth:'fixture'});
    await pending;
    assert.equal(sockets[1].sent.length,0);
  } finally { globalThis.WebSocket = original; }
});
