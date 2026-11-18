import { Fragment, createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { FinanceAdministrationProvider } from './FinanceAdministrationContext';
import { FinanceTransactionsProvider } from './FinanceTransactionsContext';
import { FinanceMastersProvider } from './FinanceMastersContext';
import { createMockFinanceService } from './mockService';
import type { FinanceSnapshot, DemoViewState } from './types';

type DemoState = { snapshot: FinanceSnapshot | null; state: DemoViewState; reset: () => void; simulate: (state: DemoViewState) => void };
const Context = createContext<DemoState | null>(null);
export function FinanceDemoProvider({ children }: { children: ReactNode }) {
  const service = useMemo(createMockFinanceService, []);
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null);
  const [state, setState] = useState<DemoViewState>('loading');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setSnapshot(null); setState('loading');
    service.loadDashboard(controller.signal).then(data => {
      if (!controller.signal.aborted) { setSnapshot(data); setState('ready'); }
    }).catch(() => { if (!controller.signal.aborted) setState('error'); });
    return () => controller.abort();
  }, [service, version]);
  return <Context.Provider value={{ snapshot, state, reset: () => setVersion(v => v + 1), simulate: setState }}><Fragment key={version}><FinanceMastersProvider><FinanceTransactionsProvider><FinanceAdministrationProvider>{children}</FinanceAdministrationProvider></FinanceTransactionsProvider></FinanceMastersProvider></Fragment></Context.Provider>;
}
export function useFinanceDemo() {
  const context = useContext(Context);
  if (!context) throw new Error('Finance demonstration provider is required.');
  return context;
}
