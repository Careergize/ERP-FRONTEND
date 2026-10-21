import { createContext, useContext, useRef, useState, useEffect, type ReactNode } from 'react';
import { workflowRequest } from '@/lib/productionWorkflowApi';
import type { JobProductionStage } from '@/types';
import { MOCK_MODELS } from '@/lib/mockData';
import { useAuth } from './AuthContext';
import type { Model } from '@/types';
import { reviseProductModel } from '@/lib/productModels';
export interface Machine { id: string; name: string; department: string; type: string; active: boolean; processIds?: string[] }
const Context = createContext<{ machines: Machine[]; addMachine: (machine: Omit<Machine, 'id'>) => Promise<void>; models: Model[]; versions: Model[]; saveModel: (model: Model) => Promise<Model>; processes: JobProductionStage[]; saveProcess: (process: JobProductionStage) => Promise<JobProductionStage>; error: string } | undefined>(undefined);
export function ModelsProvider({ children }: { children: ReactNode }) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [versions, setVersions] = useState<Model[]>(() => MOCK_MODELS.map(m => ({ ...m, revision: 1 })));
  const current = useRef(versions); const { user } = useAuth();
  const [processes, setProcesses] = useState<JobProductionStage[]>([]), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const seed = user?.id.startsWith('demo-') ? MOCK_MODELS.map(m => ({ ...m, revision: 1 })) : []; current.current = seed; setVersions(seed); setProcesses([]); setError('');
    setMachines([]);
    if (user && !user.id.startsWith('demo-')) void Promise.all([workflowRequest<Model[]>('models/'), workflowRequest<JobProductionStage[]>('processes/'), workflowRequest<Machine[]>('machines/')]).then(([models, steps, savedMachines]) => { if (active) { current.current = models; setVersions(models); setProcesses(steps); setMachines(savedMachines); } }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [user?.id]);
  const models = versions.filter(m => !versions.some(n => n.id === m.id && (n.revision ?? 1) > (m.revision ?? 1)));
  const saveModel = async (model: Model) => {
    if (!user || !['admin', 'production_manager', 'receptionist'].includes(user.role)) throw new Error('Your role cannot draft models.');
    const validated = reviseProductModel(model, current.current);
    const next = user.id.startsWith('demo-') ? validated : await workflowRequest<Model>('models/', model);
    current.current = [...current.current, next]; setVersions(current.current); return next;
  };
  const saveProcess = async (process: JobProductionStage) => {
    if (!user || !['admin', 'production_manager', 'receptionist'].includes(user.role)) throw new Error('Your role cannot add production processes.');
    const saved = user.id.startsWith('demo-') ? { ...process, id: crypto.randomUUID() } : await workflowRequest<JobProductionStage>('processes/', process);
    setProcesses(previous => [...previous, saved]); return saved;
  };
  const addMachine = async (machine: Omit<Machine, 'id'>) => {
    if (!user || user.id.startsWith('demo-')) throw new Error('Sign in with a Django account to save machines.');
    const saved = await workflowRequest<Machine>('machines/', machine);
    setMachines(rows => [...rows, saved]);
  };
  return <Context.Provider value={{ models, versions, saveModel, processes, saveProcess, error, machines, addMachine }}>{children}</Context.Provider>;
}
export function useModels() { const value = useContext(Context); if (!value) throw new Error('ModelsProvider required'); return value; }
