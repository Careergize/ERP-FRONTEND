import { createContext, useContext, useState, type ReactNode } from 'react';
import { createMasters, createSetup, validateMaster, validateSetup, type MasterKind, type MasterRecord, type SetupDraft } from './masterData';
function useDrafts() {
 const [data, setData] = useState(createMasters);
 const [setup, setSetup] = useState(createSetup);
 return { data, setup, saveSetup(value: SetupDraft) { const errors = validateSetup(value); if (!errors.length) setSetup({ ...value }); return errors; }, save(kind: MasterKind, value: MasterRecord) { const errors = validateMaster(kind, value, data); if (!errors.length) setData(previous => ({ ...previous, [kind]: value.id ? previous[kind].map(a => a.id === value.id ? { ...value } : a) : [...previous[kind], { ...value, id: `DEMO-${kind}-${Date.now()}-${previous[kind].length}` }] })); return errors; } };
}
const Context = createContext<ReturnType<typeof useDrafts> | null>(null);
export function FinanceMastersProvider({ children }: { children: ReactNode }) { const value = useDrafts(); return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useFinanceMasters() { const value = useContext(Context); if (!value) throw Error('Demo masters provider required'); return value; }
