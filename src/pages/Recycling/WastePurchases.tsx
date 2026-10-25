import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { useSharedEntry, useSharedEntryAccess, useConfirmSharedSave, useRefreshSharedEntry, useSharedEntriesPending } from '@/context/SharedEntriesContext';

const MATERIALS = ['Tank', 'LD waste', 'LD Green', 'Ld Printed waste IFB', 'HD C black', 'HD white', 'HD Yellow', 'LD blue', 'HD clear', 'HD Green', 'Jumbo cup', 'PEPSI', 'packing bags', 'LD Brown', 'Nava Pack'];
const CURRENCIES = ['UGX', 'USD', 'NGN', 'GHS', 'ZAR'];
const KEY = 'recycling-purchases';
const INPUT = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm';
const BUTTON = 'rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50';
type Purchase = { id: string; date: string; material: string; supplier: string; quantity: string; unit: string; unitPrice: string; currency: string; notes: string; status: 'Active' | 'Voided'; correctionReason: string };
type Report = { month: string; version: number; entries: (Purchase & { amount: string })[]; summary: { material: string; unit: string; currency: string; quantity: string; amount: string }[]; totals: Record<string, string> };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const display = (value: string) => Number(value).toLocaleString('en-UG', { maximumFractionDigits: 4 });
const message = (error: unknown) => {
  const detail = (error as { response?: { data?: unknown } }).response?.data;
  return detail ? JSON.stringify(detail) : error instanceof Error ? error.message : 'The request failed. Please retry.';
};

export function WastePurchases() {
  const [, setPurchases] = useSharedEntry<Purchase[]>(KEY, []);
  const [customMaterials, setCustomMaterials] = useSharedEntry<{ id: string; name: string }[]>('recycling-materials', []);
  const materials = [...MATERIALS, ...customMaterials.map(row => row.name)];
  const materialAccess = useSharedEntryAccess('recycling-materials');
  const [newMaterial, setNewMaterial] = useState('');
  const [addingMaterial, setAddingMaterial] = useState(false);
  const access = useSharedEntryAccess(KEY);
  const confirm = useConfirmSharedSave();
  const refresh = useRefreshSharedEntry();
  const pending = useSharedEntriesPending();
  const [month, setMonth] = useState(today().slice(0, 7));
  const [material, setMaterial] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [form, setForm] = useState<Purchase | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setReport(null); setError('');
    api.get<Report>('/recycling/purchases/report/', { params: { month } }).then(({ data }) => {
      if (active) setReport(data);
    }).catch(cause => { if (active) setError(message(cause)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month, attempt]);

  const reload = useCallback(async () => {
    if (pending) return;
    try { setError(''); await refresh(KEY); await refresh('recycling-materials'); setAttempt(n => n+1); }
    catch (cause) { setError(message(cause)); }
  }, [pending, refresh]);

  const start = () => {
    setEditing(false); setError(''); setNotice('');
    setForm({ id: crypto.randomUUID(), date: today().startsWith(month) ? today() : month+'-01', material: material || MATERIALS[0], supplier: '', quantity: '', unit: 'kg', unitPrice: '', currency: 'UGX', notes: '', status: 'Active', correctionReason: '' });
  };
  const addMaterial = async (event: FormEvent) => {
    event.preventDefault();
    const name = newMaterial.trim();
    if (!name || busy || pending) return;
    if (materials.some(value => value.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setError('This material already exists. Select it from the material list.'); return;
    }
    setBusy(true); setError('');
    try {
      setCustomMaterials(previous => [...previous, { id: crypto.randomUUID(), name }]);
      await confirm();
      setNewMaterial(''); setAddingMaterial(false);
      if (form) setForm(previous => previous ? { ...previous, material: name } : previous);
      setNotice(`Material “${name}” saved to the database and available for future purchases.`);
    } catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  };
  const edit = (row: Purchase & { amount: string }) => {
    const { amount: _amount, ...purchase } = row;
    setForm({ ...purchase, correctionReason: '' }); setEditing(true); setError(''); setNotice('');
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form || busy || pending) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const entry = { ...form, supplier: form.supplier.trim(), notes: form.notes.trim(), correctionReason: form.correctionReason.trim() };
      setPurchases(previous => previous.some(r => r.id === entry.id) ? previous.map(r => r.id === entry.id ? entry : r) : [...previous, entry]);
      await confirm();
      setForm(null); setMonth(entry.date.slice(0,7)); setAttempt(n => n+1);
      setNotice('Purchase saved to the database.');
    } catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  };
  const download = async (format: 'xlsx' | 'pdf') => {
    setExporting(true); setError('');
    try {
      await confirm();
      const { data } = await api.get<Blob>('/recycling/purchases/report/', { params: { month, export: format }, responseType: 'blob' });
      const url = URL.createObjectURL(data); const link = document.createElement('a');
      link.href = url; link.download = `waste-purchases-${month}.${format}`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(message(cause)); }
    finally { setExporting(false); }
  };
  const update = (key: keyof Purchase, value: string) => setForm(previous => previous ? { ...previous, [key]: value } : previous);
  const entries = report?.entries.filter(r => !material || r.material === material) ?? [];

  return <section className="mt-5 space-y-5" aria-label="Waste purchases">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h2 className="text-xl font-semibold text-navy">Module 1 · Waste Purchases</h2><p className="mt-1 text-sm text-gray-500">Record purchased recycling materials and review monthly spending.</p></div>
      <div className="flex flex-wrap gap-3"><button className={BUTTON} disabled={!materialAccess.writable || pending || busy || addingMaterial} onClick={() => { setAddingMaterial(true); setError(''); }}>Add material</button><button className={BUTTON + ' bg-navy text-white'} disabled={!access.writable || pending || busy || !!form} onClick={start}>Add purchase</button></div>
    </div>
    {addingMaterial && <Card><form aria-label="Add recycling material" onSubmit={event => void addMaterial(event)} className="flex flex-wrap items-end gap-3"><label className="min-w-60 flex-1 text-sm">New material name<input className={INPUT} required maxLength={120} value={newMaterial} disabled={busy || pending} onChange={e => setNewMaterial(e.target.value)} /></label><button className={BUTTON} disabled={busy || pending} type="submit">Save material</button><button className={BUTTON} disabled={busy || pending} type="button" onClick={() => setAddingMaterial(false)}>Cancel material</button></form><p className="mt-3 text-xs text-gray-500">Saved materials are shared with other users and remain available in future months.</p></Card>}
    <Card><div className="flex flex-wrap items-end gap-4">
      <label className="text-sm">Purchase month<input aria-label="Purchase month" className={INPUT} type="month" required value={month} disabled={busy || !!form} onChange={e => { if (e.target.value) { setMonth(e.target.value); setNotice(''); } }} /></label>
      <label className="min-w-48 text-sm">Material entries<select className={INPUT} value={material} onChange={e => setMaterial(e.target.value)}><option value="">All materials</option>{materials.map(m => <option key={m}>{m}</option>)}</select></label>
      <button className={BUTTON} disabled={pending || busy || loading || !!form} onClick={() => void reload()}>Refresh saved records</button>
      <button className={BUTTON} disabled={pending || exporting || loading || !report} onClick={() => void download('xlsx')}>Download Excel</button>
      <button className={BUTTON} disabled={pending || exporting || loading || !report} onClick={() => void download('pdf')}>Download PDF</button>
    </div><p className="mt-3 text-xs text-gray-500">Downloads include all materials for the selected month, the monthly summary and individual entries. Voided entries remain visible and are excluded from totals.</p></Card>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-teal-50 p-3 text-sm text-teal-800">{notice}</p>}
    {!access.loaded && <p className="text-sm text-gray-500">Loading entry permissions…</p>}
    {access.loaded && !access.writable && <p className="text-sm text-gray-500">Your account has read access. An authorized recycling, Store, Accounts or Admin account can record purchases.</p>}
    {form && <Card><form onSubmit={event => void save(event)} className="space-y-4" aria-label={editing ? 'Correct purchase' : 'New purchase'}>
      <h3 className="font-semibold text-navy">{editing ? 'Correct / void purchase' : 'New purchase'}</h3>
      <fieldset disabled={busy || pending} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm">Purchase date<input className={INPUT} type="date" required value={form.date} onChange={e => update('date', e.target.value)} /></label>
        <label className="text-sm">Material<select className={INPUT} value={form.material} onChange={e => update('material', e.target.value)}>{materials.map(m => <option key={m}>{m}</option>)}</select></label>
        <label className="text-sm">Supplier<input className={INPUT} required maxLength={200} value={form.supplier} onChange={e => update('supplier', e.target.value)} /></label>
        <label className="text-sm">Quantity<input className={INPUT} type="number" min="0.001" max="1000000000" step="0.001" required value={form.quantity} onChange={e => update('quantity', e.target.value)} /></label>
        <label className="text-sm">Unit<select className={INPUT} value={form.unit} onChange={e => update('unit', e.target.value)}><option value="kg">kg</option><option value="pcs">pcs</option></select></label>
        <label className="text-sm">Price per {form.unit}<input className={INPUT} type="number" min="0" max="1000000000" step="0.0001" required value={form.unitPrice} onChange={e => update('unitPrice', e.target.value)} /></label>
        <label className="text-sm">Currency<select className={INPUT} value={form.currency} onChange={e => update('currency', e.target.value)}>{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select></label>
        <label className="text-sm sm:col-span-2">Notes<textarea className={INPUT} maxLength={1000} value={form.notes} onChange={e => update('notes', e.target.value)} /></label>
        {editing && <><label className="text-sm">Status<select className={INPUT} value={form.status} onChange={e => update('status', e.target.value)}><option>Active</option><option>Voided</option></select></label><label className="text-sm sm:col-span-2">Correction / void reason<textarea className={INPUT} required maxLength={500} value={form.correctionReason} onChange={e => update('correctionReason', e.target.value)} /></label></>}
      </fieldset>
      <p className="text-sm text-gray-500">Total is calculated as quantity × unit price when saved. Earlier versions and the person making each save remain in management history.</p>
      <div className="flex flex-wrap gap-3"><button type="submit" className={BUTTON} disabled={busy || pending}>{busy ? 'Saving…' : 'Save purchase'}</button><button type="button" className={BUTTON} disabled={busy || pending} onClick={() => setForm(null)}>Cancel</button></div>
    </form></Card>}
    {loading && <p role="status" className="text-sm">Loading saved monthly purchases…</p>}
    {report && <>
      <div className="grid gap-3 sm:grid-cols-3">{Object.entries(report.totals).map(([currency, total]) => <Card key={currency}><p className="text-sm text-gray-500">Monthly purchase · {currency}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{display(total)}</p></Card>)}{!Object.keys(report.totals).length && <Card>No active purchases for {month}.</Card>}</div>
      <Card><h3 className="mb-3 font-semibold text-navy">Monthly purchase summary · {month}</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b">{['Material', 'Quantity', 'Unit', 'Currency', 'Total'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody>{report.summary.map(row => <tr className="border-b" key={[row.material,row.unit,row.currency].join(':')}><td className="px-3 py-3">{row.material}</td><td className="px-3 py-3 tabular-nums">{display(row.quantity)}</td><td className="px-3 py-3">{row.unit}</td><td className="px-3 py-3">{row.currency}</td><td className="px-3 py-3 tabular-nums">{display(row.amount)}</td></tr>)}</tbody></table></div></Card>
      <Card><h3 className="mb-3 font-semibold text-navy">Purchase entries{material ? ` · ${material}` : ''}</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b">{['Date', 'Material', 'Supplier', 'Quantity', 'Unit price', 'Total', 'Status', ''].map((label,i) => <th key={i} className="whitespace-nowrap px-3 py-3">{label}</th>)}</tr></thead><tbody>{entries.map(row => <tr key={row.id} className="border-b"><td className="whitespace-nowrap px-3 py-3">{row.date}</td><td className="px-3 py-3">{row.material}</td><td className="px-3 py-3">{row.supplier}</td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{display(row.quantity)} {row.unit}</td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{row.currency} {display(row.unitPrice)}</td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{row.currency} {display(row.amount)}</td><td className="px-3 py-3">{row.status}{row.correctionReason && <p className="mt-1 text-xs text-gray-500">{row.correctionReason}</p>}{row.notes && <p className="mt-1 text-xs text-gray-500">{row.notes}</p>}</td><td className="px-3 py-3">{row.status === 'Active' && access.writable && <button className={BUTTON} disabled={busy || pending || !!form} onClick={() => edit(row)}>Correct / void</button>}</td></tr>)}</tbody></table></div>{!entries.length && <p className="mt-3 text-sm text-gray-500">No saved entries for this selection.</p>}</Card>
    </>}
    <p className="text-xs text-gray-500">Purchase recording does not post granules or change production stock. Those operations will be handled in the next recycling modules.</p>
  </section>;
}
