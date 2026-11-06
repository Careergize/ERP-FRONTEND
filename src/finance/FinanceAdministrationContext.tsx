import { createContext, useContext, useState, type ReactNode } from 'react';
import { createAdministrationService } from './administrationService';
import type { CAConfiguration, OpeningDraft } from './administrationData';
function useAdministrationState() {
 const [service] = useState(createAdministrationService), [snapshot,setSnapshot] = useState(service.read);
 const run = (action: () => string[]) => { const errors = action(); if (!errors.length) setSnapshot(service.read()); return errors; };
 return { snapshot, match: (statement: string,ledger: string) => run(() => service.match(statement,ledger)), unmatch: (statement: string) => run(() => service.unmatch(statement)), saveOpening: (draft: OpeningDraft) => run(() => service.saveOpening(draft)), prepareReview: (key: string,reviewer: string) => run(() => service.prepareReview(key,reviewer)), requestCorrection: (key: string,actor: string,reason: string) => run(() => service.requestCorrection(key,actor,reason)), saveCA: (value: CAConfiguration) => run(() => service.saveCA(value)) };
}
const Context = createContext<ReturnType<typeof useAdministrationState> | null>(null);
export function FinanceAdministrationProvider({ children }: { children: ReactNode }) { const value = useAdministrationState(); return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useFinanceAdministration() { const value = useContext(Context); if (!value) throw Error('Demo administration provider required'); return value; }
