import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ENTRY_INPUT, SearchSelect } from '@/components/ui/SearchSelect';
import { useInventory } from '@/context/InventoryContext';
import { useJobCards } from '@/context/JobCardsContext';
import { finishedBalance, finishedGoodLabel } from '@/lib/finishedGoodsData';
import { reserved } from '@/lib/fulfillment';
import { workflowRequest } from '@/lib/productionWorkflowApi';
import { today } from '@/lib/salesOrders';
import type { JobCard, JobProductionStage, Model } from '@/types';
import { RoutingFields } from './RoutingFields';
import { JOB_BUTTON, JOB_PRIMARY } from './JobCardUI';

export function NewManualJobCard({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { load } = useJobCards();
  const { finishedProducts, finishedMovements, ledger, finishedLoading, finishedError, reloadFinished } = useInventory();
  const [models, setModels] = useState<Model[]>([]), [loading, setLoading] = useState(true);
  const [optionsError, setOptionsError] = useState(''), [attempt, setAttempt] = useState(0);
  const [mode, setMode] = useState('manual'), [itemId, setItemId] = useState<string>();
  const [name, setName] = useState(''), [quantity, setQuantity] = useState('');
  const [modelId, setModelId] = useState(''), [due, setDue] = useState(''), [specifications, setSpecifications] = useState('');
  const [stages, setStages] = useState<JobProductionStage[]>([]);
  const [error, setError] = useState(''), [saving, setSaving] = useState(false);
  const creationKey = useRef(crypto.randomUUID()), locked = useRef(false);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true; setLoading(true); setOptionsError('');
    workflowRequest<{ models: Model[] }>('order-options/').then(data => { if (active) setModels(data.models); })
      .catch(e => { if (active) setOptionsError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; dialog.current?.querySelector<HTMLElement>('button')?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const available = (id: string) => {
    const product = finishedProducts.find(p => p.id === id);
    if (!product) return undefined;
    const balance = finishedBalance(product, finishedMovements).currentStock;
    return balance === null ? undefined : balance - reserved(ledger, id);
  };
  const selectedModel = models.find(m => m.id === modelId);
  const modelUnit = selectedModel?.productionBatchUnit ?? selectedModel?.batchUnit ?? selectedModel?.defaultUnit ?? '';
  const unit = mode === 'existing' ? finishedProducts.find(p => p.id === itemId)?.unit ?? '' : modelUnit;
  const unitMismatch = !!unit && !!modelUnit && unit !== modelUnit;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (locked.current) return; setError('');
    const model = models.find(m => m.id === modelId);
    if (!name.trim() || !model || !unit || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0 || !due || due < today()) { setError('Enter a product, saved model, positive quantity, matching output unit and delivery date on or after today.'); return; }
    if (unitMismatch) { setError(`The product unit (${unit}) differs from the model output unit (${modelUnit}). Select a model with the same output unit.`); return; }
    if (mode === 'existing' && (!itemId || available(itemId) !== 0)) { setError('Select an existing item with exactly zero available stock. Unknown balances cannot create a Job Card.'); return; }
    if (!stages.length || !stages.some(s => s.required)) { setError('Add at least one required workflow step.'); return; }
    locked.current = true; setSaving(true);
    try {
      const card = await workflowRequest<JobCard>('jobs/', { creationKey: creationKey.current, itemName: name.trim(), itemId: mode === 'existing' ? itemId : undefined, quantity: Number(quantity), unit, modelId: model.id, modelRevision: model.revision, requiredDate: due, specifications, jobRouting: stages });
      await load(); onClose(); navigate(`/job-cards/${card.id}?tab=costing`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create Job Card.'); locked.current = false; setSaving(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/30 p-4" role="dialog" aria-modal="true" aria-labelledby="manual-job-title" onKeyDown={event => {
    if (event.key === 'Escape' && !saving) { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key === 'Tab') {
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary') ?? []);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}><div ref={dialog} className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-card bg-white p-6 shadow-xl">
    <div className="flex justify-between"><div><h2 id="manual-job-title" className="text-lg font-semibold text-navy">Create Job Card</h2><p className="text-sm text-gray-500">Production without a Sales Order. Send to Production Manager review.</p></div><button type="button" disabled={saving} onClick={onClose} className={JOB_BUTTON}>Close</button></div>
    {loading && <p role="status">Loading production models…</p>}
    {optionsError && <p role="alert">{optionsError} <button onClick={() => setAttempt(n => n + 1)} className={JOB_BUTTON}>Retry models</button></p>}
    {finishedError && mode === 'existing' && <p role="alert">{finishedError} <button onClick={() => void reloadFinished()} className={JOB_BUTTON}>Reload stock</button></p>}
    <form onSubmit={submit} className="mt-5 space-y-4"><fieldset disabled={saving} className="space-y-4">
      <label className="block text-sm">Product entry<select className={ENTRY_INPUT} value={mode} onChange={e => { setMode(e.target.value); setItemId(undefined); setName(''); setModelId(''); setStages([]); }}><option value="manual">Enter custom product manually</option><option value="existing">Existing item (zero available stock)</option></select></label>
      {mode === 'manual' ? <label className="block text-sm">Product name<input required value={name} onChange={e => setName(e.target.value)} className={ENTRY_INPUT} /></label> : <SearchSelect label="Existing product" value={name} options={finishedProducts.map(p => ({ id: p.id, name: finishedGoodLabel(p), detail: available(p.id) === undefined ? 'Stock not recorded' : `Available: ${available(p.id)} ${p.unit}` }))} onChange={value => { setName(value); setItemId(undefined); }} onSelect={option => { const p = finishedProducts.find(p => p.id === option.id)!; setItemId(p.id); setName(option.name); }} />}
      <label className="block text-sm">Production model / material recipe<select required className={ENTRY_INPUT} value={modelId} onChange={e => { const m = models.find(m => m.id === e.target.value); setModelId(e.target.value); setStages(structuredClone(m?.routing ?? []).map(s => ({ ...s, id: crypto.randomUUID(), expectedInput: undefined, expectedOutput: undefined }))); }}><option value="">Select saved model</option>{models.map(m => <option key={m.id} value={m.id}>{m.name} · Revision {m.revision}</option>)}</select></label>
      <div className="grid gap-4 sm:grid-cols-3"><label>Production quantity<input required type="number" min="0" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} className={ENTRY_INPUT} /></label><label>Output unit<input aria-label="Output unit" placeholder={mode === 'existing' ? 'Select an existing product' : 'Select a production model'} required value={unit} readOnly className={`${ENTRY_INPUT} bg-gray-50`} /></label><label>Required date<input required type="date" min={today()} value={due} onChange={e => setDue(e.target.value)} className={ENTRY_INPUT} /></label></div>
      <p className="text-xs text-gray-500">Output unit comes from the selected product or the model production output.</p>{unitMismatch && <p role="alert" className="text-sm text-red-700">Product unit {unit} does not match model output unit {modelUnit}. Select a matching model.</p>}
      <label className="block">Specifications<textarea value={specifications} onChange={e => setSpecifications(e.target.value)} className={ENTRY_INPUT} /></label>
      <RoutingFields stages={stages} onChange={setStages} />
    </fieldset>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2 flex-wrap max-w-full"><button type="button" disabled={saving} onClick={onClose} className={JOB_BUTTON}>Cancel</button><button type="submit" disabled={saving || loading || !!optionsError || (mode === 'existing' && (finishedLoading || !!finishedError))} className={JOB_PRIMARY}>{saving ? 'Creating…' : 'Create & Send for Review'}</button></div>
    </form>
  </div></div>;
}
