import type { ReactNode } from 'react';
import { useFinanceAccess, type FinanceAccessState } from '@/context/FinanceAccessContext';

export function FinanceAccessBoundary({ state, children }: { state: FinanceAccessState; children: ReactNode }) {
  if (state.loading) return <p role="status">Checking Finance access…</p>;
  if (state.error) return <div role="alert"><p>Unable to check Finance access.</p><button className="mt-3 rounded-lg border px-4 py-2" onClick={state.retry}>Retry access check</button></div>;
  if (!state.access?.entitled) return <div role="alert"><h1 className="text-xl font-semibold">Finance access denied</h1><p className="mt-2">Explicit Finance access is required. Contact your administrator.</p></div>;
  return <>{children}</>;
}

export function FinanceRouteGuard({ children }: { children: ReactNode }) {
  return <FinanceAccessBoundary state={useFinanceAccess()}>{children}</FinanceAccessBoundary>;
}
