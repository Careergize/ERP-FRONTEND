import { draftContent, DraftRequestError, editableDraft, isControlledDraft, orderDraftApi, orderPK, validateDraft,
  type DraftCommand, type DraftContent, type DraftHistory, type DraftRecord } from './orderDraftApi';
import { today } from './salesOrders';

export const blankDraft = (): DraftContent => ({ customerName: '', date: today(),
  marketingPersonName: '', customerType: '', currency: '', taxRate: '', items: [] });
type Pending = { pk: number | null; command: DraftCommand };
export interface DraftEditorState {
  content: DraftContent; reason: string; order: DraftRecord | null; history: DraftHistory | null;
  busy: boolean; error: string; fields: unknown; notice: string; pending: boolean; conflict: boolean;
}
// The component and focused tests share this state machine; it never invokes inventory/Job Card APIs.
export class OrderDraftEditor {
  private listeners = new Set<() => void>();
  private pending: Pending | null = null;
  private generation = 0;
  private disposed = false;
  private storageKey: string;
  private state: DraftEditorState = { content: blankDraft(), reason: '', order: null, history: null,
    busy: false, error: '', fields: {}, notice: '', pending: false, conflict: false };
  constructor(private actor: string, private transport = orderDraftApi, private storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>) {
    this.storageKey = `task04-draft-pending:${actor}`;
    try {
      const saved = storage?.getItem(this.storageKey);
      if (saved) {
        const pending = JSON.parse(saved) as Pending;
        if (!pending.command?.commandId || !(pending.pk === null || Number.isSafeInteger(pending.pk))) throw new Error();
        validateDraft(pending.command.content, pending.command.reason);
        this.pending = pending;
        this.state = { ...this.state, content: structuredClone(pending.command.content), reason: pending.command.reason,
          pending: true, error: 'An unconfirmed save was restored. Retry it before changing or reopening a Draft.' };
      }
    } catch { try { this.storage?.removeItem(this.storageKey); } catch { /* A save will fail before sending if storage is unavailable. */ } }
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(change: Partial<DraftEditorState>) {
    this.state = { ...this.state, ...change };
    this.listeners.forEach(listener => listener());
  }
  dispose() { this.disposed = true; this.generation++; }
  change(content: DraftContent, reason = this.state.reason) {
    if (this.state.busy || this.pending || this.state.conflict || this.state.order && !editableDraft(this.state.order)) return;
    this.update({ content: structuredClone(content), reason, notice: '', error: '', fields: {} });
  }
  async open(id: string) {
    if (this.state.busy || this.pending) return;
    const attempt = ++this.generation;
    this.update({ busy: true, notice: '', error: '', fields: {} });
    try {
      const pk = orderPK(id);
      const order = await this.transport.read(pk);
      if (this.disposed || attempt !== this.generation) return;
      this.update({ order, content: draftContent(order), history: null, reason: '', conflict: false,
        notice: isControlledDraft(order) ? 'Draft loaded from the backend.' : 'Legacy record: control version unknown. Read only; no conversion performed.' });
    } catch (error) {
      if (!this.disposed && attempt === this.generation) { this.failed(error); this.update({ conflict: true }); }
    } finally { if (!this.disposed && attempt === this.generation) this.update({ busy: false }); }
  }
  private failed(error: unknown) {
    this.update({ error: error instanceof Error ? error.message : 'Draft request failed.',
      fields: error instanceof DraftRequestError ? error.fields : {} });
  }
  async save(): Promise<DraftRecord | undefined> {
    if (this.state.busy || this.state.conflict || this.disposed) return;
    if (!this.actor || this.actor.startsWith('demo-')) { this.failed(new Error('Sign in with a Django account.')); return; }
    if (this.state.order && !editableDraft(this.state.order)) { this.failed(new Error('This record is read only.')); return; }
    this.update({ busy: true, error: '', notice: '', fields: {} });
    try {
      if (!this.pending) {
        validateDraft(this.state.content, this.state.reason);
        this.pending = { pk: this.state.order ? orderPK(this.state.order.id) : null,
          command: { commandId: crypto.randomUUID(), expectedVersion: this.state.order?.controlVersion ?? 0,
            reason: this.state.reason, evidenceIds: [], content: structuredClone(this.state.content) } };
        // Refuse to send if pending identity cannot be retained for a refresh/retry.
      }
      this.storage?.setItem(this.storageKey, JSON.stringify(this.pending));
      this.update({ pending: true });
      const result = await this.transport.save(this.pending.pk, this.pending.command);
      this.storage?.removeItem(this.storageKey);
      this.pending = null;
      if (!this.disposed) this.update({ order: result, content: draftContent(result), history: null,
        reason: '', pending: false, notice: `${result.orderNumber} saved by the backend · version ${result.controlVersion}.` });
      return this.disposed ? undefined : result;
    } catch (error) {
      const definite = error instanceof DraftRequestError && error.status !== undefined && error.status >= 400 && error.status < 500;
      if (definite) { this.pending = null; this.storage?.removeItem(this.storageKey); }
      if (!this.disposed) {
        this.failed(error);
        this.update({ pending: this.pending !== null, conflict: error instanceof DraftRequestError &&
          ['VERSION_CONFLICT', 'COMMAND_PAYLOAD_CONFLICT'].includes(error.code ?? '') });
      }
    } finally { if (!this.disposed) this.update({ busy: false }); }
  }
  async history() {
    if (!this.state.order || this.state.busy || this.pending) return;
    this.update({ busy: true, error: '' });
    try {
      const history = await this.transport.history(orderPK(this.state.order.id));
      if (!this.disposed) this.update({ history });
    } catch (error) { if (!this.disposed) this.failed(error); }
    finally { if (!this.disposed) this.update({ busy: false }); }
  }
}
