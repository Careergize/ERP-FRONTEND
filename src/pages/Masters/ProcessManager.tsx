import { useState, type FormEvent } from 'react';
import { useModels } from '@/context/ModelsContext';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { ENTRY_INPUT } from '@/components/ui/SearchSelect';
import { newRoutingStage } from '@/pages/JobCards/RoutingFields';

export function ProcessManager() {
  const { processes, machines, saveProcess, addMachine, error: loadError } = useModels();
  const { user } = useAuth();
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const editable = !!user && ['admin', 'receptionist', 'production_manager'].includes(user.role);
  const submit = async (event: FormEvent<HTMLFormElement>, kind: 'process' | 'machine') => {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget, data = new FormData(form);
    setBusy(true); setError('');
    try {
      if (kind === 'process') await saveProcess({ ...newRoutingStage(), name: String(data.get('name')), department: String(data.get('department')), inputUnit: String(data.get('inputUnit')), outputUnit: String(data.get('outputUnit')), wasteUnit: String(data.get('wasteUnit')) });
      else await addMachine({ name: String(data.get('name')), department: String(data.get('department')), type: String(data.get('type')), active: true, processIds: data.getAll('processIds').map(String) });
      form.reset();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save.'); }
    finally { setBusy(false); }
  };
  return <div className="space-y-5"><h1 className="text-2xl font-semibold text-navy">Processes &amp; Machines</h1><p>Define processes separately, then register the machines that perform them. Choose and order steps independently for each manufacturing Job Card.</p>{(error || loadError) && <p role="alert" className="text-red-700">{error || loadError}</p>}
    <Card className="space-y-4"><h2 className="font-semibold">Processes</h2>{!processes.length && <p>No saved processes.</p>}{processes.map(p => <p key={p.id}>{p.name} · {p.department} · {p.inputUnit} → {p.outputUnit}</p>)}{editable && <form onSubmit={e => void submit(e, 'process')} className="grid gap-3 sm:grid-cols-3">{[['name', 'Process name'], ['department', 'Department'], ['inputUnit', 'Input unit'], ['outputUnit', 'Output unit'], ['wasteUnit', 'Waste unit']].map(([key, label]) => <label key={key}>{label}<input required name={key} className={ENTRY_INPUT} /></label>)}<button disabled={busy} className="rounded border px-4 py-2">Save Process</button></form>}</Card>
    <Card className="space-y-4"><h2 className="font-semibold">Machines</h2>{!machines.length && <p>No saved machines.</p>}{machines.map(m => <p key={m.id}>{m.name} · {m.department} · {(m.processIds ?? []).map(id => processes.find(p => p.id === id)?.name ?? id).join(', ')}</p>)}{editable && <form onSubmit={e => void submit(e, 'machine')} className="grid gap-3 sm:grid-cols-2"><label>Machine name<input required name="name" className={ENTRY_INPUT} /></label><label>Department<input required name="department" className={ENTRY_INPUT} /></label><label>Machine type<input required name="type" placeholder="e.g. Printing machine" className={ENTRY_INPUT} /></label><label>Processes performed<select required multiple name="processIds" className={ENTRY_INPUT}>{processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><span className="text-xs text-gray-500">Select one or more supported processes.</span></label><button disabled={busy || !processes.length} className="rounded border px-4 py-2">Save Machine</button></form>}</Card>
  </div>;
}
