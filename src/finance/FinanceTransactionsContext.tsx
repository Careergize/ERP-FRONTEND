import { createContext, useContext, useState, type ReactNode } from 'react';
import { useFinanceMasters } from './FinanceMastersContext';
import { createTransactionService } from './transactionService';
import type { FinanceDocument } from './transactionData';
function useTransactions() {
  const [service] = useState(createTransactionService);
  const [snapshot, setSnapshot] = useState(service.read);
  const { data } = useFinanceMasters();
  return { snapshot, save(document: FinanceDocument) { const result = service.save(document, data); if (!result.errors.length) setSnapshot(service.read()); return result; } };
}
const Context = createContext<ReturnType<typeof useTransactions> | null>(null);
export function FinanceTransactionsProvider({ children }: { children: ReactNode }) { const value = useTransactions(); return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useFinanceTransactions() { const value = useContext(Context); if (!value) throw Error('Demo transactions provider required'); return value; }
