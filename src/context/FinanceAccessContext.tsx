import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { loadFinanceAccess, type FinanceAccess } from '@/lib/financeGateway';
import { readToken } from '@/lib/authSession';

export type FinanceAccessState = {
  loading: boolean; error: boolean; access: FinanceAccess | null; retry: () => void;
};
const Context = createContext<FinanceAccessState | undefined>(undefined);

export function FinanceAccessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const owner = user?.id ?? '';
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ owner: string; loading: boolean; error: boolean; access: FinanceAccess | null }>({ owner: '', loading: false, error: false, access: null });
  useEffect(() => {
    const controller = new AbortController();
    if (!owner || !(readToken('navapack_access') || readToken('navapack_refresh'))) {
      setResult({ owner, loading: false, error: false, access: null });
      return () => controller.abort();
    }
    setResult({ owner, loading: true, error: false, access: null });
    loadFinanceAccess(controller.signal).then(access => {
      if (!controller.signal.aborted) setResult({ owner, loading: false, error: false, access });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ owner, loading: false, error: true, access: null });
    });
    return () => controller.abort();
  }, [owner, attempt]);
  useEffect(() => {
    const refresh = () => setAttempt(value => value + 1);
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);
  const current = result.owner === owner ? result : { loading: true, error: false, access: null };
  return <Context.Provider value={{ ...current, retry: () => setAttempt(value => value + 1) }}>{children}</Context.Provider>;
}

export function useFinanceAccess() {
  const value = useContext(Context);
  if (!value) throw new Error('FinanceAccessProvider is required.');
  return value;
}
