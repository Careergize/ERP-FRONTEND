// Synthetic adapter/controller checks; no HTTP server or business DB.
import assert from 'node:assert/strict';
import net from 'node:net';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}
globalThis.localStorage = new MemoryStorage();
globalThis.sessionStorage = new MemoryStorage();
globalThis.window = new EventTarget();
const server = await createServer({ configFile: false,
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function () { throw new Error('Outbound sockets blocked.'); };
try {
  const { api } = await server.ssrLoadModule('/src/lib/api.ts');
  const { JobDraftCommands, jobDraftApi, jobPK, JOB_DRAFT_TEST_ENABLED } = await server.ssrLoadModule('/src/lib/jobDraftApi.ts');
  const { DraftRequestError } = await server.ssrLoadModule('/src/lib/orderDraftApi.ts');
  assert.equal(JOB_DRAFT_TEST_ENABLED, false);
  for (const id of ['0', '-1', '1.5', 'wf-job-1', '9007199254740992']) assert.throws(() => jobPK(id));
  assert.equal(jobPK('12'), 12);
  const result = { workflowKey: 12, workflowVersion: 1, salesOrderId: 'wf-order-2', sourceConfirmedRevision: 3,
    reviewStatus: 'Draft', operationalBlockCodes: ['AUTHORITY_NOT_CONFIGURED'],
    capabilities: { edit: true, approve: false, reject: false, issue: false },
    manufacturingItems: [{ id: 'child', salesOrderItemId: 'line-1', product: 'Synthetic', qty: '20', unit: 'ctn',
      requiredMaterials: [{ id: 'requirement', materialId: 'raw', name: 'Synthetic resin', unit: 'kg', requiredQuantity: 10, issuedQuantity: 0 }] }] };
  const command = { expectedVersion: 0, reason: 'Synthetic create', evidenceIds: [], orderId: 2,
    expectedOrderVersion: 1, sourceConfirmedRevision: 3, corrections: {} };
  const calls = [];
  let failure, delay, malformed = false;
  api.defaults.adapter = async config => {
    const payload = config.data ? JSON.parse(config.data) : undefined;
    calls.push({ url: config.url, payload });
    assert.match(config.url, /^\/production-workflow\/job-drafts\/(?:\d+\/(?:history\/)?)?$/);
    if (delay) await delay;
    if (failure) throw failure;
    const data = { ...structuredClone(result), workflowVersion: payload ? payload.expectedVersion + 1 : 1 };
    return { data: malformed ? { ...data, workflowKey: 99 } : data, status: 200, statusText: 'OK', headers: {}, config };
  };
  const storage = new MemoryStorage();
  let editor = new JobDraftCommands('actor-a', storage);
  failure = new Error('lost response');
  await assert.rejects(editor.save(null, command));
  const first = structuredClone(calls.at(-1));
  assert.ok(editor.pending.command.commandId);
  editor = new JobDraftCommands('actor-a', storage);
  assert.deepEqual(editor.pending.command, first.payload);
  assert.equal(new JobDraftCommands('actor-b', storage).pending, null);
  failure = undefined;
  const saved = await editor.save(null, { ...command, reason: 'Ignored during exact retry' });
  assert.deepEqual(calls.at(-1), first);
  assert.equal(saved.workflowKey, 12);
  assert.equal(editor.pending, null);
  assert.equal(storage.values.size, 0);
  let release;
  delay = new Promise(resolve => { release = resolve; });
  const pending = editor.save(12, { ...command, expectedVersion: 1 });
  const count = calls.length;
  assert.equal(await editor.save(12, command), undefined);
  assert.equal(calls.length, count);
  release(); await pending; delay = undefined;
  failure = { response: { status: 409, data: { code: 'VERSION_CONFLICT', detail: 'Reload', fields: {} } } };
  await assert.rejects(editor.save(12, { ...command, expectedVersion: 1 }), e => e instanceof DraftRequestError && e.code === 'VERSION_CONFLICT');
  assert.equal(editor.conflict, true);
  assert.equal(editor.pending, null);
  const staleCalls = calls.length;
  await editor.save(12, command);
  assert.equal(calls.length, staleCalls);
  failure = { response: { status: 403, data: { code: 'PERMISSION_DENIED', detail: 'Denied' } } };
  editor = new JobDraftCommands('actor-a', storage);
  await assert.rejects(editor.save(null, command), e => e.status === 403);
  assert.equal(editor.pending, null);
  failure = undefined; malformed = true;
  await assert.rejects(editor.save(12, command));
  assert.ok(editor.pending);
  malformed = false;
  await editor.save(12, command);
  assert.equal(editor.pending, null);
  const brokenStorage = { getItem: () => null, removeItem() {}, setItem() { throw new Error('Storage unavailable'); } };
  const noStorage = new JobDraftCommands('actor-a', brokenStorage);
  const previous = calls.length;
  await assert.rejects(noStorage.save(null, command));
  assert.equal(calls.length, previous);
  await assert.rejects(new JobDraftCommands('demo-user', storage).save(null, command));
  assert.equal(calls.length, previous);
  await jobDraftApi.read(12);
  await jobDraftApi.history(12);
  console.log('Job Draft adapter/controller: retry persistence, actor isolation, double-click, version conflict, permissions, malformed response and storage guards passed.');
} finally { net.Socket.prototype.connect = connect; await server.close(); }
