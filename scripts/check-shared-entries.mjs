import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}
globalThis.localStorage = new MemoryStorage();
globalThis.sessionStorage = new MemoryStorage();
globalThis.window = new EventTarget();
sessionStorage.setItem('navapack_access', 'test-token');
const server = await createServer({ configFile: false, resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } }, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
  const { api } = await server.ssrLoadModule('/src/lib/api.ts');
  const { SharedEntryStore, loadSharedEntries } = await server.ssrLoadModule('/src/lib/sharedEntryStore.ts');
  const bootstrap = () => ({ entries: [], readable: ['exchange-rates'], writable: ['exchange-rates'] });
  const requests = [];
  api.defaults.adapter = async config => {
    const commands = JSON.parse(config.data).commands; requests.push(...commands);
    return { data: { results: commands.map(body => ({ key: body.key, version: body.expectedVersion + 1, commandId: body.commandId })) }, status: 200, statusText: 'OK', headers: {}, config };
  };
  const store = new SharedEntryStore(bootstrap());
  store.set('exchange-rates', [], [{ id: 'fx1', rate: 3700 }]);
  store.set('exchange-rates', [], previous => [...previous, { id: 'fx2', rate: 3710 }]);
  await store.confirm();
  while (store.running) await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(requests.map(row => row.expectedVersion), [0, 1]);
  assert.equal(store.pending.length, 0);
  assert.equal(store.versions.get('exchange-rates'), 2);
  assert.throws(() => store.set('commercial-company', {}, {}), /cannot save/);
  assert.throws(() => store.set('exchange-rates', [], [{ rate: Infinity }]), /finite/);

  let attempt = 0; const retryRequests = [];
  api.defaults.adapter = async config => {
    const body = JSON.parse(config.data).commands[0]; retryRequests.push(body);
    if (!attempt++) throw new Error('Connection lost before confirmation');
    return { data: { results: [{ key: body.key, version: 3, commandId: body.commandId }] }, status: 200, statusText: 'OK', headers: {}, config };
  };
  store.set('exchange-rates', [], previous => [...previous, { id: 'fx3' }]);
  const rejectedConfirmation = assert.rejects(store.confirm(), /Connection lost/);
  await new Promise(resolve => setImmediate(resolve));
  while (store.running) await new Promise(resolve => setImmediate(resolve));
  assert.match(store.error, /Connection lost/);
  await rejectedConfirmation;
  assert.equal(store.pending.length, 1);
  assert.throws(() => store.set('exchange-rates', [], []), /pending database save/);
  assert.equal(JSON.parse(store.exportPending()).pending[0].content.length, 3);
  await store.pump();
  assert.equal(retryRequests[0].commandId, retryRequests[1].commandId);
  assert.equal(retryRequests[0].expectedVersion, retryRequests[1].expectedVersion);
  assert.equal(store.pending.length, 0);

  api.defaults.adapter = async () => { throw { response: { status: 409, data: { detail: 'Another user changed this record' } } }; };
  store.set('exchange-rates', [], previous => [...previous, { id: 'fx4' }]);
  await new Promise(resolve => setImmediate(resolve));
  while (store.running) await new Promise(resolve => setImmediate(resolve));
  assert.match(store.error, /Another user/);
  assert.equal(store.errorStatus,409);
  assert.equal(store.pending.length, 1);
  api.defaults.adapter = async config => ({ data: { ...bootstrap(), entries: [{ key: 'exchange-rates', version: 4, content: [{ id: 'other-account-rate' }] }] }, status: 200, statusText: 'OK', headers: {}, config });
  await store.discardAndReload();
  assert.equal(store.pending.length, 0);
  assert.equal(store.get('exchange-rates', [])[0].id, 'other-account-rate');
  assert.equal(store.errorStatus,null);
  api.defaults.adapter=async()=>{throw {response:{status:403,data:{detail:'Your backend role cannot record Stock IN'}}};};
  store.set('exchange-rates',[],[{id:'permission-test'}]);
  await new Promise(resolve=>setImmediate(resolve));
  while(store.running)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(store.errorStatus,403);assert.equal(store.pending.length,1);
  assert.match(store.exportPending(),/permission-test/);
  api.defaults.adapter=async config=>({data:{...bootstrap(),entries:[{key:'exchange-rates',version:4,content:[{id:'other-account-rate'}]}]},status:200,statusText:'OK',headers:{},config});
  await store.discardAndReload();assert.equal(store.errorStatus,null);
  const reloaded = await loadSharedEntries();
  assert.equal(reloaded.get('exchange-rates', [])[0].id, 'other-account-rate');

  let resolveWrite;
  api.defaults.adapter = config => new Promise(resolve => { resolveWrite = () => resolve({ data: { results: [{ key: 'exchange-rates', version: 1, commandId: JSON.parse(config.data).commands[0].commandId }] }, status: 200, statusText: 'OK', headers: {}, config }); });
  const priorAccount = new SharedEntryStore(bootstrap());
  priorAccount.set('exchange-rates', [], [{ id: 'old-account' }]);
  while (!resolveWrite) await new Promise(resolve => setImmediate(resolve));
  priorAccount.dispose(); resolveWrite();
  while (priorAccount.running) await new Promise(resolve => setImmediate(resolve));
  assert.equal(priorAccount.versions.size, 0);
  assert.throws(() => priorAccount.set('exchange-rates', [], []), /cannot save/);
  console.log('PASS: shared-entry hydration, serialized versioned saves, visible failure, stable retry IDs, conflicts, export/reload recovery and account disposal.');
} finally { await server.close(); }
