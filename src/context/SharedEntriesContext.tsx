import { createContext, useContext, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type SetStateAction } from 'react';
import { loadSharedEntries, SharedEntryStore } from '@/lib/sharedEntryStore';
import { useAuth } from './AuthContext';

const Context = createContext<SharedEntryStore | null>(null);
const LoadingContext=createContext<{error:string;retry?:()=>void}>({error:''});

export function useSharedEntryAccess(key: string) {
  const store = useContext(Context);
  useSyncExternalStore(store?.subscribe ?? (() => () => {}), store?.snapshot ?? (() => 0));
  const loading=useContext(LoadingContext);
  return { loaded: !!store, writable: !!store?.writable.has(key), error:loading.error, retry:loading.retry };
}

export function useSharedEntry<T>(key: string, initial: T | (() => T)): [T, (update: SetStateAction<T>) => void] {
  const store = useContext(Context);
  const fallback = useRef<T>();
  if (fallback.current === undefined) fallback.current = typeof initial === 'function' ? (initial as () => T)() : initial;
  const idleSubscribe = () => () => {};
  useSyncExternalStore(store?.subscribe ?? idleSubscribe, store?.snapshot ?? (() => 0));
  return [store ? store.get(key, fallback.current) : fallback.current, update => {
    if (!store) throw new Error('This record is still loading from the backend. Retry after loading finishes.');
    store.set(key, fallback.current!, update);
  }];
}

function SaveStatus({ store }: { store: SharedEntryStore }) {
  useSyncExternalStore(store.subscribe, store.snapshot);
  const blocked = store.pending.length > 0;
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (store.pending.length) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [store]);
  if (!blocked) return null;
  const download = () => {
    const url = URL.createObjectURL(new Blob([store.exportPending()], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'unsaved-erp-entries.json'; link.click(); URL.revokeObjectURL(url);
  };
  const reload = async () => {
    if (!window.confirm('Discard these unsaved changes and reload database records? Export them first if you need to reapply them.')) return;
    try { await store.discardAndReload(); window.location.reload(); } catch (cause) { store.error = cause instanceof Error ? cause.message : 'Reload failed.'; store.emit(); }
  };
  return <div className="fixed bottom-4 right-4 z-[100] w-[calc(100%-2rem)] max-w-xl rounded-xl border bg-white p-5 shadow-xl" aria-label="Database save status">
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{store.error ? 'Entry has not been saved' : 'Saving entry to the database…'}</h2>
      {store.error ? <><p role="alert" className="text-sm text-red-700">{store.error}</p><p className="text-sm">{store.errorStatus===403?'Permission denied: this entry remains unsaved. Export pending entries before signing out or reloading. Ask an administrator to check the assigned backend role; retry after that is corrected.':store.errorStatus===409?'Another user changed this record. Export pending entries, reload the saved records, and reapply the change.':'Keep this page open. Export pending entries before reloading so you can reapply any unsaved changes.'}</p><div className="flex flex-wrap gap-3"><button onClick={() => void store.pump()}>Retry save</button><button onClick={download}>Export pending entries</button><button onClick={() => void reload()}>Discard pending changes and reload</button></div></> : <p role="status" className="text-sm">Wait for backend confirmation before continuing.</p>}
    </div>
  </div>;
}

function AccountEntries({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<SharedEntryStore | null>(null);
  const [error, setError] = useState(''); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; let loaded: SharedEntryStore | undefined;
    setError('');
    void loadSharedEntries().then(result => { loaded = result; if (active) setStore(result); else result.dispose(); })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load shared records.'); });
    return () => { active = false; loaded?.dispose(); };
  }, [attempt]);
  return <LoadingContext.Provider value={{error,retry:()=>setAttempt(n=>n+1)}}><Context.Provider value={store}>{children}{store ? <SaveStatus store={store} /> : <div className="fixed bottom-4 right-4 z-[100] max-w-lg rounded-xl border bg-white p-4 shadow-lg"><p role={error ? 'alert' : 'status'}>{error ? `Shared records could not be loaded; affected entry forms cannot save. ${error}` : 'Loading shared records; affected entry forms will become available when loading finishes.'}</p>{error && <button onClick={() => setAttempt(n => n + 1)}>Retry loading records</button>}</div>}</Context.Provider></LoadingContext.Provider>;
}

export function SharedEntriesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <>{children}</>;
  if (user.id.startsWith('demo-')) return <>{children}<p role="note" className="fixed bottom-4 right-4 z-[100] rounded-xl border bg-white p-4">Use a real backend account to save shared business records.</p></>;
  return <AccountEntries key={user.id}>{children}</AccountEntries>;
}

export function useSharedEntriesPending() {
  const store = useContext(Context);
  useSyncExternalStore(store?.subscribe ?? (() => () => {}), store?.snapshot ?? (() => 0));
  return !!store?.pending.length;
}

export function useConfirmSharedSave() {
  const store = useContext(Context);
  return async () => {
    // Shared setters already reject edits before loading. Existing independent
    // API-backed forms must remain usable if this supporting service is down.
    if (!store) return;
    await store.confirm();
  };
}

export function useRefreshSharedEntry() {
  const store = useContext(Context); const current = useRef(store); current.current = store;
  return useCallback(async (key: string) => { await current.current?.refreshKey(key); }, []);
}
