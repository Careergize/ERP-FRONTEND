import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useJobCards } from '@/context/JobCardsContext';
import { Card } from '@/components/ui/Card';
import { ENTRY_INPUT } from '@/components/ui/SearchSelect';
import type { PlannedCostInput } from '@/lib/jobPlannedCosting';
import type { JobCard } from '@/types';
import { JOB_BUTTON, JOB_PRIMARY } from './JobCardUI';

const money = (n?: number | null) => n == null ? 'Pending' : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const number = (text: string) => text === '' ? null : Number(text);
export function PlannedJobCosting({ card }: { card: JobCard }) {
  const { user } = useAuth(), { savePlannedCosting } = useJobCards();
  const sheet = card.plannedCosting;
  const [draft, setDraft] = useState<PlannedCostInput | undefined>(() => sheet && structuredClone(sheet.input));
  const [draftRevision, setDraftRevision] = useState(sheet?.revision ?? 0);
  const [dirty, setDirty] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState('');
  useEffect(() => { if (!dirty) { setDraft(sheet && structuredClone(sheet.input)); setDraftRevision(sheet?.revision ?? 0); } }, [sheet, dirty]);
  const editable = !card.approval && card.status === 'PendingApproval' && ['admin', 'accounts', 'receptionist', 'production_manager'].includes(user?.role ?? '');
  const canApprove = ['admin', 'production_manager'].includes(user?.role ?? '');
  const edit = (change: Partial<PlannedCostInput>) => { setDraft(current => current && ({ ...current, ...change })); setDirty(true); };
  const save = async (approve = false) => {
    if (saving) return; setSaving(true); setError('');
    try { await savePlannedCosting(card.id, approve ? undefined : draft, approve, draftRevision); setDirty(false); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save costing.'); }
    finally { setSaving(false); }
  };
  const totals = dirty ? null : sheet?.totals;
  return <Card className="planned-costing-sheet space-y-4">
    <style>{'@media print { body:has(.planned-costing-sheet) * { visibility: hidden; } body:has(.planned-costing-sheet) .planned-costing-sheet, body:has(.planned-costing-sheet) .planned-costing-sheet * { visibility: visible; } .planned-costing-sheet { position:absolute; left:0; top:0; width:100%; box-shadow:none; } .planned-costing-sheet button { display:none; } }'}</style>
    <div><h2 className="font-semibold text-navy">Job Card Planned Costing Sheet</h2><p>{card.jobCardNumber} · {card.product} · {card.qty} {card.unit}</p><p className="text-sm">{card.salesOrderNumber || 'Manual production'} · Model revision {card.modelRevision} · Costing revision {sheet?.revision ?? 'Not created'} · {sheet?.status ?? 'Not created'}</p></div>
    <p className="text-xs text-gray-500">Automatically prepared from this Job Card’s saved materials and process steps. Enter confirmed purchase prices, process costs and exchange rates. Actual wastage is recorded by the machine employee during production.</p>
    {!sheet && editable && <button className={JOB_BUTTON} disabled={saving} onClick={() => void save()}>Create Planned Costing Sheet</button>}
    {draft && <fieldset disabled={!editable || saving} className="space-y-4">
      <div className="flex flex-wrap gap-4"><label>Costing currency<select className={ENTRY_INPUT} value={draft.currency} onChange={e => edit({ currency: e.target.value, materials: draft.materials.map(m => ({ ...m, exchangeRate: null })) })}><option>UGX</option><option>USD</option></select></label><label>Sales VAT %<input className={ENTRY_INPUT} type="number" min="0" max="100" step="any" value={draft.taxRate ?? ''} onChange={e => edit({ taxRate: number(e.target.value) })} /></label></div>
      <h3 className="font-medium">Material composition and purchase costs</h3>
      <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead><tr>{['Material', 'Required quantity', 'Price', 'Price unit', 'Purchase currency', 'Exchange rate', 'Price includes VAT', 'Purchase VAT %', 'Net cost'].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{draft.materials.map((m, i) => {
        const update = (change: Partial<typeof m>) => edit({ materials: draft.materials.map((row, index) => index === i ? { ...row, ...change } : row) });
        return <tr key={m.materialId}><td className="p-2">{m.name}</td><td>{m.quantity} {m.unit}</td><td><input aria-label={`Purchase price ${m.name}`} type="number" min="0" step="any" value={m.price ?? ''} onChange={e => update({ price: number(e.target.value) })} className={ENTRY_INPUT} /></td><td><input aria-label={`Price unit ${m.name}`} value={m.priceUnit ?? ''} onChange={e => update({ priceUnit: e.target.value })} className={ENTRY_INPUT} /></td><td><select aria-label={`Currency ${m.name}`} value={m.currency ?? ''} onChange={e => update({ currency: e.target.value, exchangeRate: null })} className={ENTRY_INPUT}><option value="">Select</option><option>UGX</option><option>USD</option></select></td><td><input aria-label={`Exchange rate ${m.name}`} disabled={m.currency === draft.currency} type="number" min="0" step="any" value={m.currency === draft.currency ? 1 : m.exchangeRate ?? ''} onChange={e => update({ exchangeRate: number(e.target.value) })} className={ENTRY_INPUT} /></td><td><input aria-label={`Price includes VAT ${m.name}`} type="checkbox" checked={m.priceIncludesVAT} onChange={e => update({ priceIncludesVAT: e.target.checked })} /></td><td><input aria-label={`Purchase VAT ${m.name}`} type="number" min="0" max="100" step="any" value={m.purchaseTaxRate ?? ''} onChange={e => update({ purchaseTaxRate: number(e.target.value) })} className={ENTRY_INPUT} /></td><td>{money(totals?.materials.find(r => r.materialId === m.materialId)?.total)}</td></tr>;
      })}</tbody></table></div><p className="text-xs text-gray-500">Exchange rate = costing currency per 1 purchase currency. VAT-inclusive prices are divided by (1 + VAT rate). Material quantities and units come from the saved Job Card.</p>
      <h3 className="font-medium">Process costs</h3>{draft.processes.map((p, i) => {
        const update = (change: Partial<typeof p>) => edit({ processes: draft.processes.map((row, index) => index === i ? { ...row, ...change } : row) });
        return <div key={p.stageId} className="grid gap-3 sm:grid-cols-5"><p>{p.name}</p><label>Cost basis<select className={ENTRY_INPUT} value={p.basis} onChange={e => update({ basis: e.target.value, unit: e.target.value === 'per kg' ? 'kg' : e.target.value === 'per piece' ? 'pcs' : 'batch' })}>{['fixed', 'per kg', 'per piece', 'per batch'].map(b => <option key={b}>{b}</option>)}</select></label><label>Rate ({draft.currency})<input aria-label={`Process rate ${p.name}`} className={ENTRY_INPUT} type="number" min="0" step="any" value={p.rate ?? ''} onChange={e => update({ rate: number(e.target.value) })} /></label><label>Cost quantity ({p.unit})<input disabled={p.basis === 'fixed'} className={ENTRY_INPUT} type="number" min="0" step="any" value={p.basis === 'fixed' ? 1 : p.quantity ?? ''} onChange={e => update({ quantity: number(e.target.value) })} /></label><p>{money(totals?.processes.find(r => r.stageId === p.stageId)?.total)}</p></div>;
      })}
      <div className="flex flex-wrap gap-4"><label>Other overheads ({draft.currency})<input className={ENTRY_INPUT} type="number" min="0" step="any" value={draft.overheads ?? ''} onChange={e => edit({ overheads: number(e.target.value) })} /></label><label>Additional costs ({draft.currency})<input className={ENTRY_INPUT} type="number" min="0" step="any" value={draft.additionalCosts ?? ''} onChange={e => edit({ additionalCosts: number(e.target.value) })} /></label></div>
      <label className="block"><input type="checkbox" checked={draft.ledApplies} onChange={e => edit({ ledApplies: e.target.checked })} /> LED applies — higher of 2.5% or USD 70 per metric tonne</label>
      {draft.ledApplies && <div className="grid gap-3 sm:grid-cols-3"><label>LED percentage base<select className={ENTRY_INPUT} value={draft.ledBase} onChange={e => edit({ ledBase: e.target.value })}><option value="net-selling">Price before VAT</option><option value="production-cost">Production cost</option></select></label><label>Eligible weight (kg)<input className={ENTRY_INPUT} type="number" min="0" step="any" value={draft.eligibleWeightKG ?? ''} onChange={e => edit({ eligibleWeightKG: number(e.target.value) })} /></label><label>Weight conversion source<input className={ENTRY_INPUT} value={draft.weightReference} onChange={e => edit({ weightReference: e.target.value })} /></label><label>USD → UGX exchange rate<input className={ENTRY_INPUT} type="number" min="0" step="any" value={draft.usdToUGX ?? ''} onChange={e => edit({ usdToUGX: number(e.target.value) })} /></label><label>Exchange-rate date<input className={ENTRY_INPUT} type="date" value={draft.fxDate} onChange={e => edit({ fxDate: e.target.value })} /></label><label><input type="checkbox" checked={draft.vatOnLED} onChange={e => edit({ vatOnLED: e.target.checked })} /> VAT applies to LED</label></div>}
    </fieldset>}
    {dirty && <p role="status" className="text-amber-700">Unsaved inputs. Save and calculate to update totals.</p>}
    {!dirty && sheet?.validationError && <p role="alert" className="text-amber-700">Costing incomplete: {sheet.validationError}</p>}
    {totals && <><dl className="grid gap-4 sm:grid-cols-4">{[['Material cost', totals.materialCost], ['Process cost', totals.processCost], ['Planned production cost', totals.productionCost], [`Cost per ${card.unit}`, totals.costPerUnit]].map(([label, amount]) => <div key={label}><dt>{label}</dt><dd>{draft?.currency} {money(Number(amount))}</dd></div>)}</dl><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead><tr>{['Markup on cost', 'Profit', 'Before VAT', 'LED', 'VAT', 'Selling total', `Selling price / ${card.unit}`].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{totals.scenarios.map(s => <tr key={s.markup}>{[`${s.markup}%`, money(s.profit), money(s.beforeTax), money(s.led), money(s.vat), money(s.total), money(s.unitPrice)].map((v, i) => <td key={i} className="p-2">{v}</td>)}</tr>)}</tbody></table></div></>}
    {sheet?.approvedBy && <p>PM approved by {sheet.approvedBy} · {sheet.approvedAt}</p>}
    <p className="text-xs text-gray-500">Actual final production cost remains pending until actual consumption, machine costs and operator-recorded wastage are available.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-3 print:hidden max-w-full">{editable && sheet && <><button className={JOB_BUTTON} disabled={saving} onClick={() => void save()}>Save & Calculate Planned Costing</button>{canApprove && <button className={JOB_PRIMARY} disabled={saving || dirty || !totals || sheet.status === 'Approved'} onClick={() => void save(true)}>PM Approve Costing</button>}</>}{sheet && <button className={JOB_BUTTON} disabled={dirty || saving} onClick={() => window.print()}>Print Costing Sheet / Save PDF</button>}</div>
  </Card>;
}
