// Isolated adapter + shared editor-state tests. Every Axios call is intercepted;
// sockets are blocked. This is not a browser E2E or live-backend assertion.
import assert from 'node:assert/strict';
import net from 'node:net';
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
const server = await createServer({ configFile: false,
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function () { throw new Error('Outbound sockets blocked by Draft tests.'); };
try {
  const { api } = await server.ssrLoadModule('/src/lib/api.ts');
  const { OrderDraftEditor } = await server.ssrLoadModule('/src/lib/orderDraftEditor.ts');
  const { draftTestEnabled, draftContent, editableDraft, isControlledDraft } = await server.ssrLoadModule('/src/lib/orderDraftApi.ts');
  const content = { customerName: 'Synthetic customer', date: '2026-10-22', marketingPersonName: 'Synthetic sales',
    customerType: 'B2B', currency: 'USD', taxRate: '18', quotationId: 'source-quote',
    items: [{ id: 'stock-line', itemName: 'Synthetic bags', fulfillmentSource: 'stock', itemId: 'synthetic-stock', quantity: '2.50', unit: 'kg', unitPrice: '4.00' },
      { id: 'manufactured-line', itemName: 'Synthetic boxes', fulfillmentSource: 'manufacturing', modelId: 'saved-model', modelRevision: 3,
        requiredDate: '2026-10-24', quantity: '5', unit: 'ctn', unitPrice: '2', quotationLineId: 'source-line' }],
    commercialPricing: { taxMode: 'exclusive', discount: 0, roundingPolicy: 'Existing rule' } };
  let saved;
  let revisions = [];
  let failure;
  let delay;
  const receipts = new Map(), calls = [];
  const fail = (status, code, detail = 'Synthetic rejection', fields = {}) => ({ response: { status, data: { code, detail, fields } } });
  api.defaults.adapter = async config => {
    const payload = config.data === undefined ? undefined : JSON.parse(config.data);
    calls.push({ method: config.method, url: config.url, payload });
    assert.match(config.url, /^\/production-workflow\/order-drafts\/(?:\d+\/(?:history\/)?)?$/);
    if (delay) await delay;
    if (failure) throw failure;
    let data;
    if (config.method === 'get') data = config.url.endsWith('history/') ? { orderId: 7, revisions: structuredClone(revisions) } : structuredClone(saved);
    else {
      const replay = receipts.get(payload.commandId);
      if (replay) { assert.deepEqual(replay.payload, payload); data = replay.data; }
      else {
        const version = payload.expectedVersion + 1;
        data = { ...structuredClone(payload.content), id: 'wf-order-7', orderNumber: 'SO-W00007', status: 'Draft',
          jobCardIds: [], controlVersion: version, commercialStatus: 'Draft', currentRevision: version,
          confirmedRevision: null, orderTotal: 23.6, createdBy: 'actor-1', entryRequest: structuredClone(content) };
        saved = structuredClone(data);
        revisions.push({ id: version, revision: version, content: structuredClone(payload.content),
          contentHash: 'a'.repeat(64), capturedAt: '2026-10-22T10:00:00Z', reason: payload.reason });
        receipts.set(payload.commandId, { payload, data: structuredClone(data) });
      }
    }
    return { config, status: config.method === 'get' ? 200 : payload.expectedVersion === 0 ? 201 : 200,
      statusText: 'OK', data, headers: {} };
  };
  assert.equal(draftTestEnabled('true', 'http://127.0.0.1:8000/api'), true);
  for (const [flag, base] of [['false', 'http://localhost:8000/api'], ['true', 'https://example.com/api'], [undefined, 'http://localhost:8000/api']]) assert.equal(draftTestEnabled(flag, base), false);

  const storage = new MemoryStorage();
  const editor = new OrderDraftEditor('actor-1', undefined, storage);
  editor.change(content, 'Synthetic create');
  let release; delay = new Promise(resolve => { release = resolve; });
  const save = editor.save();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(editor.getSnapshot().busy, true);
  assert.equal(editor.getSnapshot().notice, '');
  assert.equal(await editor.save(), undefined, 'Duplicate click never sends a second request');
  assert.equal(calls.filter(call => call.method === 'post').length, 1);
  release(); delay = undefined;
  const first = await save;
  assert.equal(first.controlVersion, 1);
  assert.match(editor.getSnapshot().notice, /saved by the backend/);
  assert.deepEqual(first.items, content.items);
  assert.deepEqual(calls[0].payload.content, content);
  assert.equal('allocateJobCard' in calls[0].payload.content, false);
  assert.equal(storage.values.size, 0);

  const fresh = new OrderDraftEditor('actor-1', undefined, storage);
  await fresh.open('wf-order-7');
  assert.equal(calls.at(-1).method, 'get');
  assert.deepEqual(fresh.getSnapshot().content, content, 'Refresh reconstructs editable content from a real read, not cache');
  const changed = structuredClone(content); changed.items[0].quantity = '3.125';
  fresh.change(changed, 'Synthetic edit');
  const second = await fresh.save();
  assert.equal(second.controlVersion, 2);
  assert.equal(calls.at(-1).payload.expectedVersion, 1);
  assert.notEqual(calls.at(-1).payload.commandId, calls[0].payload.commandId);
  assert.deepEqual(second.items[1], content.items[1], 'Untouched manufacturing source/revision/unit/quantity remain exact');
  await fresh.history();
  assert.deepEqual(fresh.getSnapshot().history.revisions.map(row => row.revision), [1, 2]);

  const invalid = new OrderDraftEditor('actor-2');
  invalid.change({ ...content, items: [{ ...content.items[0], quantity: '0' }] }, 'Invalid');
  const beforeInvalid = calls.length;
  await invalid.save();
  assert.equal(calls.length, beforeInvalid);
  assert.match(invalid.getSnapshot().error, /quantity/);
  assert.equal(invalid.getSnapshot().notice, '');

  failure = fail(400, 'VALIDATION_ERROR', 'Check the supplied Draft fields.', { unit: ['Exact saved unit required'] });
  invalid.change(content, 'Backend validation');
  await invalid.save();
  assert.match(invalid.getSnapshot().error, /Check the supplied/);
  assert.deepEqual(invalid.getSnapshot().fields, { unit: ['Exact saved unit required'] });
  assert.equal(invalid.getSnapshot().pending, false);
  failure = fail(403, 'PERMISSION_DENIED');
  await invalid.save();
  assert.match(invalid.getSnapshot().error, /not authorised/);
  failure = fail(401, 'token_not_valid');
  await invalid.save();
  assert.match(invalid.getSnapshot().error, /Authentication failed/);
  assert.equal(invalid.getSnapshot().notice, '');

  failure = new Error('Synthetic network outage');
  const uncertainStorage = new MemoryStorage();
  const uncertain = new OrderDraftEditor('actor-3', undefined, uncertainStorage);
  uncertain.change(content, 'Network retry');
  await uncertain.save();
  const uncertainPayload = calls.at(-1).payload;
  assert.equal(uncertain.getSnapshot().pending, true);
  uncertain.change(changed, 'Must not change');
  assert.deepEqual(uncertain.getSnapshot().content, content);
  const callsBeforeOpen = calls.length;
  await uncertain.open('7');
  assert.equal(calls.length, callsBeforeOpen, 'Reopening cannot discard an uncertain command');
  const restored = new OrderDraftEditor('actor-3', undefined, uncertainStorage);
  assert.equal(restored.getSnapshot().pending, true);
  assert.equal(new OrderDraftEditor('another-actor', undefined, uncertainStorage).getSnapshot().pending, false);
  failure = undefined;
  await restored.save();
  assert.deepEqual(calls.at(-1).payload, uncertainPayload, 'Retry after refresh uses exact UUID/version/payload');
  assert.equal(uncertainStorage.values.size, 0);

  failure = fail(409, 'VERSION_CONFLICT');
  fresh.change(changed, 'Stale edit');
  await fresh.save();
  assert.equal(fresh.getSnapshot().conflict, true);
  assert.deepEqual(fresh.getSnapshot().content, changed);
  const beforeConflict = calls.length;
  await fresh.save();
  assert.equal(calls.length, beforeConflict);
  assert.match(fresh.getSnapshot().error, /Reload/);
  failure = undefined;
  await fresh.open('7');
  assert.equal(fresh.getSnapshot().conflict, false);

  saved = { ...saved, controlVersion: null, commercialStatus: null, currentRevision: null };
  await fresh.open('7');
  assert.equal(isControlledDraft(fresh.getSnapshot().order), false);
  assert.equal(editableDraft(fresh.getSnapshot().order), false);
  const beforeLegacy = calls.length;
  fresh.change(content, 'Must not convert legacy');
  await fresh.save();
  assert.equal(calls.length, beforeLegacy);
  assert.match(fresh.getSnapshot().error, /read only/);
  assert.equal('controlVersion' in draftContent(saved), false);
  failure = fail(404, 'NOT_FOUND');
  const unreadable = new OrderDraftEditor('actor-4');
  await unreadable.open('99');
  const beforeUnreadable = calls.length;
  await unreadable.save();
  assert.equal(calls.length, beforeUnreadable, 'A failed reopen cannot become an accidental create');
  assert.equal(unreadable.getSnapshot().conflict, true);

  failure = undefined;
  let storageBlocked = true;
  const blockedStorage = { getItem: () => null, removeItem() {}, setItem() { if (storageBlocked) throw new Error('Synthetic storage failure'); } };
  const blocked = new OrderDraftEditor('actor-5', undefined, blockedStorage);
  blocked.change(content, 'Retained identity required');
  const beforeStorage = calls.length;
  await blocked.save();
  assert.equal(calls.length, beforeStorage, 'No POST if exact retry identity cannot be persisted');
  assert.equal(blocked.getSnapshot().pending, true);
  storageBlocked = false;
  await blocked.save();
  assert.match(blocked.getSnapshot().notice, /saved by the backend/);

  const demo = new OrderDraftEditor('demo-receptionist');
  demo.change(content, 'Never a local success');
  const beforeDemo = calls.length;
  await demo.save();
  assert.equal(calls.length, beforeDemo);
  assert.equal(demo.getSnapshot().notice, '');
  const normalAdapter = api.defaults.adapter;
  api.defaults.adapter = async config => ({ config, status: 201, statusText: 'Created', data: { id: 'wrong-record' }, headers: {} });
  const malformed = new OrderDraftEditor('actor-6', undefined, new MemoryStorage());
  malformed.change(content, 'Malformed success is uncertain');
  await malformed.save();
  assert.equal(malformed.getSnapshot().pending, true);
  assert.equal(malformed.getSnapshot().notice, '');
  api.defaults.adapter = normalAdapter;
  await malformed.save();
  assert.match(malformed.getSnapshot().notice, /saved by the backend/);
  assert.ok(calls.every(call => !/allocate|jobs|stock|movement/.test(call.url)));
  console.log('PASS: controlled Draft API/editor create, refresh/read, multi-product/source preservation, edit/version, history, validation, 401/403, network retry across refresh, duplicate click, stale conflict, legacy read-only and test-only gate. No stock/Job Card requests.');
} finally {
  net.Socket.prototype.connect = originalConnect;
  await server.close();
}
