import type { DemoViewState } from '@/finance/types';
export function FinanceViewState({ state, retry }: { state: Exclude<DemoViewState, 'ready'>; retry: () => void }) {
  const message = state === 'loading' ? 'Loading fictional demonstration data…' : state === 'empty' ? 'No demonstration data to display.' : 'Simulated preview error. No connection was attempted.';
  return <div className="rounded-card border border-slate-200 bg-white p-8"><p role={state === 'error' ? 'alert' : 'status'}>{message}</p><button className="mt-4 rounded-lg border px-4 py-2 text-sm" onClick={retry}>Reset local preview</button></div>;
}
