import { api } from './api';

export interface SavedEntry { key: string; content: unknown; version: number }
interface Bootstrap { entries: SavedEntry[]; readable: string[]; writable: string[] }
interface Pending { key: string; content: unknown; commandId: string; expectedVersion?: number }

// One store per authenticated account. Pending writes are serialized, never
// silently merged with a newer version written by another member of staff.
export class SharedEntryStore {
  values = new Map<string, unknown>();
  versions = new Map<string, number>();
  readable = new Set<string>();
  writable = new Set<string>();
  pending: Pending[] = [];
  error = '';
  errorStatus: number | null = null;
  running = false;
  disposed = false;
  revision = 0;
  listeners = new Set<() => void>();
  constructor(data: Bootstrap) {
    this.readable = new Set(data.readable); this.writable = new Set(data.writable);
    for (const row of data.entries) { this.values.set(row.key, row.content); this.versions.set(row.key, row.version); }
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  snapshot = () => this.revision;
  emit = () => { this.revision++; this.listeners.forEach(listener => listener()); };
  dispose() { this.disposed = true; this.emit(); }
  get<T>(key: string, fallback: T): T { return this.values.has(key) ? this.values.get(key) as T : fallback; }
  set<T>(key: string, fallback: T, update: T | ((value: T) => T)) {
    if (this.disposed || !this.writable.has(key)) throw new Error('Your account cannot save this record. Use the authorized backend workflow.');
    if (this.error) throw new Error('Resolve the pending database save before entering more records.');
    const previous = this.get(key, fallback);
    const content = typeof update === 'function' ? (update as (value: T) => T)(previous) : update;
    // Match the JSON sent to Django, rejecting non-finite numbers and cyclic data.
    const encoded = JSON.stringify(content, (_key, value) => {
      if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Enter finite numbers before saving.');
      return value;
    });
    if (encoded === undefined) throw new Error('Invalid shared record.');
    const copy: unknown = JSON.parse(encoded);
    if (JSON.stringify(previous) === encoded) return;
    this.values.set(key, copy);
    this.pending.push({ key, content: copy, commandId: crypto.randomUUID() });
    this.emit(); queueMicrotask(() => { void this.pump(); });
  }
  async pump() {
    if (this.running || this.disposed) return;
    this.running = true; this.error = ''; this.errorStatus = null; this.emit();
    try {
      while (this.pending.length && !this.disposed) {
        const batch = this.pending.slice(0, 50), versions = new Map(this.versions);
        for (const item of batch) {
          item.expectedVersion ??= versions.get(item.key) ?? 0;
          versions.set(item.key, item.expectedVersion + 1);
        }
        const { data } = await api.post<{ results: { key: string; version: number; commandId: string }[] }>('/shared-entry-commands/', { commands: batch }, { timeout: 20000 });
        if (!Array.isArray(data.results) || data.results.length !== batch.length || data.results.some((row, index) => row.key !== batch[index].key || row.commandId !== batch[index].commandId || !Number.isSafeInteger(row.version))) throw new Error('The backend did not confirm this save.');
        if (this.disposed) return;
        for (const row of data.results) this.versions.set(row.key, row.version);
        this.pending.splice(0, batch.length);
      }
    } catch (cause) {
      this.errorStatus = (cause as {response?:{status?:number}}).response?.status ?? null;
      const detail = (cause as { response?: { data?: unknown } }).response?.data;
      this.error = typeof detail === 'object' && detail && 'detail' in detail ? String(detail.detail) :
        detail ? JSON.stringify(detail) : cause instanceof Error ? cause.message : 'The database save failed.';
    } finally { this.running = false; if (!this.disposed) this.emit(); }
  }
  async discardAndReload() {
    if (this.running) throw new Error('Wait for the current database request to finish.');
    const fresh = await loadSharedEntries();
    if (this.disposed) return;
    this.values = fresh.values; this.versions = fresh.versions;
    this.readable = fresh.readable; this.writable = fresh.writable;
    this.pending = []; this.error = ''; this.errorStatus = null; this.emit();
  }
  async refreshKey(key: string) {
    await this.confirm();
    const fresh = await loadSharedEntries();
    if (this.disposed || this.pending.length) return;
    if (fresh.values.has(key)) this.values.set(key, fresh.values.get(key));
    else this.values.delete(key);
    this.versions.set(key, fresh.versions.get(key) ?? 0); this.emit();
  }
  async confirm() {
    if (this.error) throw new Error(this.error);
    if (!this.pending.length) return;
    return new Promise<void>((resolve, reject) => {
      const unsubscribe = this.subscribe(() => {
        if (this.disposed || this.error) { unsubscribe(); reject(new Error(this.error || 'The account changed before save confirmation.')); }
        else if (!this.pending.length) { unsubscribe(); resolve(); }
      });
    });
  }
  exportPending() { return JSON.stringify({ exportedAt: new Date().toISOString(), pending: this.pending }, null, 2); }
}

export async function loadSharedEntries() {
  const { data } = await api.get<Bootstrap>('/shared-entries/', { timeout: 20000 });
  if (!Array.isArray(data.entries) || !Array.isArray(data.readable) || !Array.isArray(data.writable)) throw new Error('Invalid shared-record response.');
  return new SharedEntryStore(data);
}
