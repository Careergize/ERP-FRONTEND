import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { useSharedEntry, useSharedEntryAccess, useConfirmSharedSave, useRefreshSharedEntry, useSharedEntriesPending } from '@/context/SharedEntriesContext';

// Source: July 2026 recycled-material workbook. Surrounding spaces removed.
const MATERIALS = ['HDPE BlacK_Inhouse', 'HDPE Clear Jerrycan', 'HDPE White', 'HDPE Yellow', 'HD Black jerrican RP', 'LDPE Clear_Inhouse', 'LDPE Brown_Inhouse', 'LDPE Blue (Jumbo Cap)', 'LDPE Green', 'LDPE Clear', 'Tank', 'HDPE Pipe', 'LD Wateya', 'HD Pure white'];
const KEY = 'recycled-material-entries', CATALOG = 'recycled-material-catalog';
const INPUT = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm';
const BUTTON = 'rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-50';
type Entry = { id: string; date: string; material: string; bags: string; pricePerKg: string; currency: string; notes: string; status: 'Active' | 'Voided'; correctionReason: string };
type SavedEntry = Entry & { kg: string; amount: string };
type Summary = { material: string; currency: string; pricePerKg: string; daily: Record<string, string>; bags: string; kg: string; amount: string };
type Report = { month: string; version: number; days: string[]; entries: SavedEntry[]; summary: Summary[]; bags: string; kg: string; totals: Record<string, string> };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const display = (n: string | number) => Number(n).toLocaleString('en-UG', { maximumFractionDigits: 4 });
const message = (e: unknown) => {
  const detail = (e as { response?: { data?: unknown } }).response?.data;
  return detail ? JSON.stringify(detail) : e instanceof Error ? e.message : 'Request failed. Please retry.';
};

export function RecycledMaterials() {
  const [, setEntries] = useSharedEntry<Entry[]>(KEY, []);
  const [custom, setCustom] = useSharedEntry<{ id: string; name: string }[]>(CATALOG, []);
  const access = useSharedEntryAccess(KEY), catalogAccess = useSharedEntryAccess(CATALOG);
  const confirm = useConfirmSharedSave(), refresh = useRefreshSharedEntry(), pending = useSharedEntriesPending();
  const materials = [...MATERIALS, ...custom.map(r => r.name)];
  const [month, setMonth] = useState(today().slice(0,7)), [filter, setFilter] = useState('');
  const [report, setReport] = useState<Report | null>(null), [form, setForm] = useState<Entry | null>(null);
  const [editing, setEditing] = useState(false), [newMaterial, setNewMaterial] = useState<string | null>(null);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setReport(null); setError('');
    api.get<Report>('/recycling/materials/report/', { params: { month } }).then(({ data }) => { if (active) setReport(data); })
      .catch(e => { if (active) setError(message(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month, attempt]);
  const reload = async () => {
    setBusy(true); setError('');
    try { await refresh(KEY); await refresh(CATALOG); setAttempt(n => n+1); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  };
  const start = () => {
    setEditing(false); setError(''); setNotice('');
    setForm({ id: crypto.randomUUID(), date: today().startsWith(month) ? today() : month+'-01', material: filter || MATERIALS[0], bags: '', pricePerKg: '', currency: '', notes: '', status: 'Active', correctionReason: '' });
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!form || busy || pending) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const entry = { ...form, notes: form.notes.trim(), correctionReason: form.correctionReason.trim() };
      setEntries(previous => previous.some(r => r.id === entry.id) ? previous.map(r => r.id === entry.id ? entry : r) : [...previous, entry]);
      await confirm(); setForm(null); setMonth(entry.date.slice(0,7)); setAttempt(n => n+1); setNotice('Bag entry saved to the database.');
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  };
  const addMaterial = async (event: FormEvent) => {
    event.preventDefault(); const name = newMaterial?.trim(); if (!name || busy || pending) return;
    if (materials.some(m => m.toLowerCase() === name.toLowerCase())) { setError('This material already exists.'); return; }
    setBusy(true); setError('');
    try {
      setCustom(previous => [...previous, { id: crypto.randomUUID(), name }]); await confirm();
      setNewMaterial(null); setNotice('Recycled material saved.'); if (form) setForm({ ...form, material: name });
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  };
  const download = async () => {
    setBusy(true); setError('');
    try {
      await confirm();
      const { data } = await api.get<Blob>('/recycling/materials/report/', { params: { month, export: 'xlsx' }, responseType: 'blob' });
      const url = URL.createObjectURL(data), link = document.createElement('a');
      link.href = url; link.download = `recycled-materials-${month}.xlsx`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  };
  const edit = (row: SavedEntry) => {
    const { kg: _kg, amount: _amount, ...entry } = row;
    setForm({ ...entry, correctionReason: '' }); setEditing(true); setError(''); setNotice('');
  };
  const update = (key: keyof Entry, value: string) => setForm(previous => previous ? { ...previous, [key]: value } : previous);
  const summary = report?.summary.filter(r => !filter || r.material === filter) ?? [];
  const entries = report?.entries.filter(r => !filter || r.material === filter) ?? [];
  return <section className="mt-5 space-y-5" aria-label="Recycled materials">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-semibold text-navy">Module 2 · Recycled Materials</h2><p className="mt-1 text-sm text-gray-500">Daily bags · 1 bag = 40 kg · Value = bags × 40 × price per kg.</p></div><div className="flex flex-wrap gap-3"><button className={BUTTON} disabled={!catalogAccess.writable || busy || pending || newMaterial !== null} onClick={() => setNewMaterial('')}>Add material</button><button className={BUTTON} disabled={!access.writable || busy || pending || !!form} onClick={start}>Add bag entry</button></div></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-teal-50 p-3 text-sm text-teal-800">{notice}</p>}
    {newMaterial !== null && <Card><form onSubmit={e => void addMaterial(e)} className="flex flex-wrap items-end gap-3" aria-label="Add recycled material"><label className="flex-1 text-sm">Material name<input className={INPUT} required maxLength={120} value={newMaterial} disabled={busy || pending} onChange={e => setNewMaterial(e.target.value)} /></label><button className={BUTTON} disabled={busy || pending}>Save material</button><button type="button" className={BUTTON} disabled={busy || pending} onClick={() => setNewMaterial(null)}>Cancel</button></form></Card>}
    <Card><div className="flex flex-wrap items-end gap-4"><label className="text-sm">Report month<input className={INPUT} type="month" required value={month} disabled={busy || !!form} onChange={e => { if (e.target.value) { setMonth(e.target.value); setNotice(''); } }} /></label><label className="text-sm">Material<select className={INPUT} value={filter} onChange={e => setFilter(e.target.value)}><option value="">All materials</option>{materials.map(m => <option key={m}>{m}</option>)}</select></label><button className={BUTTON} disabled={busy || pending || loading || !!form} onClick={() => void reload()}>Refresh saved records</button><button className={BUTTON} disabled={busy || pending || loading || !report || !!form} onClick={() => void download()}>Download Excel</button></div><p className="mt-3 text-xs text-gray-500">Excel includes all materials for the selected month, daily bags, entry details and monthly totals.</p></Card>
    {access.loaded && !access.writable && <p className="text-sm text-gray-500">Read access. Recycling, Store, Accounts or Admin staff with entry permission can save records.</p>}
    {form && <Card><form onSubmit={e => void save(e)} className="space-y-4" aria-label={editing ? 'Correct bag entry' : 'New bag entry'}><h3 className="font-semibold">{editing ? 'Correct / void bag entry' : 'New bag entry'}</h3><fieldset disabled={busy || pending} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm">Date<input className={INPUT} type="date" required value={form.date} onChange={e => update('date', e.target.value)} /></label>
      <label className="text-sm">Recycled material<select className={INPUT} value={form.material} onChange={e => update('material', e.target.value)}>{materials.map(m => <option key={m}>{m}</option>)}</select></label>
      <label className="text-sm">Number of bags<input className={INPUT} type="number" required min="1" max="1000000000" step="1" value={form.bags} onChange={e => update('bags', e.target.value)} /></label>
      <label className="text-sm">Price per kg<input className={INPUT} type="number" required min="0" max="1000000000" step="0.0001" value={form.pricePerKg} onChange={e => update('pricePerKg', e.target.value)} /></label>
      <label className="text-sm">Currency<select className={INPUT} required value={form.currency} onChange={e => update('currency', e.target.value)}><option value="">Select currency</option>{['UGX','USD','NGN','GHS','ZAR'].map(c => <option key={c}>{c}</option>)}</select></label>
      <label className="text-sm">Notes<textarea className={INPUT} maxLength={1000} value={form.notes} onChange={e => update('notes', e.target.value)} /></label>
      {editing && <><label className="text-sm">Status<select className={INPUT} value={form.status} onChange={e => update('status', e.target.value)}><option>Active</option><option>Voided</option></select></label><label className="text-sm sm:col-span-2">Correction / void reason<textarea className={INPUT} required maxLength={500} value={form.correctionReason} onChange={e => update('correctionReason', e.target.value)} /></label></>}
    </fieldset><p className="text-sm text-gray-600">{form.bags ? `${display(Number(form.bags)*40)} kg` : 'Enter bags to calculate kg'}{form.bags && form.pricePerKg && form.currency ? ` · ${form.currency} ${display(Number(form.bags)*40*Number(form.pricePerKg))} estimated value` : ''}. Saved totals are calculated by the server.</p><div className="flex gap-3"><button className={BUTTON} disabled={busy || pending}>{busy ? 'Saving…' : 'Save bag entry'}</button><button className={BUTTON} type="button" disabled={busy || pending} onClick={() => setForm(null)}>Cancel</button></div></form></Card>}
    {loading && <p role="status">Loading saved recycled materials…</p>}
    {report && <><div className="grid gap-3 sm:grid-cols-3"><Card><p className="text-sm text-gray-500">Monthly bags · all materials</p><p className="mt-2 text-2xl font-semibold">{display(report.bags)}</p><p className="text-sm">{display(report.kg)} kg</p></Card>{Object.entries(report.totals).map(([currency,total]) => <Card key={currency}><p className="text-sm text-gray-500">Monthly value · {currency}</p><p className="mt-2 text-2xl font-semibold">{display(total)}</p></Card>)}</div>
      <Card><h3 className="mb-3 font-semibold">Daily bags · {month}{filter ? ` · ${filter}` : ''}</h3><div className="overflow-x-auto"><table className="w-full whitespace-nowrap text-left text-sm"><thead><tr className="border-b">{['Material','Currency','Price/kg',...report.days.map(d => d.slice(-2)),'Total bags','Total kg','Total amount'].map((h,i) => <th key={i} className="px-3 py-3">{h}</th>)}</tr></thead><tbody>{summary.map(r => <tr key={[r.material,r.currency,r.pricePerKg].join(':')} className="border-b"><td className="px-3 py-3">{r.material}</td><td className="px-3 py-3">{r.currency}</td><td className="px-3 py-3">{display(r.pricePerKg)}</td>{report.days.map(d => <td key={d} className="px-3 py-3 tabular-nums">{r.daily[d] ? display(r.daily[d]) : '—'}</td>)}<td className="px-3 py-3">{display(r.bags)}</td><td className="px-3 py-3">{display(r.kg)}</td><td className="px-3 py-3">{display(r.amount)}</td></tr>)}</tbody></table></div>{!summary.length && <p className="mt-3 text-sm text-gray-500">No active bag entries for this selection.</p>}<p className="mt-3 text-xs text-gray-500">Different prices and currencies are shown separately. Voided entries are excluded from totals.</p></Card>
      <Card><h3 className="mb-3 font-semibold">Saved bag entries</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b">{['Date','Material','Bags','kg','Price/kg','Amount','Status / notes',''].map((h,i) => <th key={i} className="px-3 py-3">{h}</th>)}</tr></thead><tbody>{entries.map(r => <tr key={r.id} className="border-b"><td className="whitespace-nowrap px-3 py-3">{r.date}</td><td className="px-3 py-3">{r.material}</td><td className="px-3 py-3">{display(r.bags)}</td><td className="px-3 py-3">{display(r.kg)}</td><td className="whitespace-nowrap px-3 py-3">{r.currency} {display(r.pricePerKg)}</td><td className="whitespace-nowrap px-3 py-3">{r.currency} {display(r.amount)}</td><td className="px-3 py-3">{r.status}{r.notes && <p>{r.notes}</p>}{r.correctionReason && <p>{r.correctionReason}</p>}</td><td className="px-3 py-3">{r.status === 'Active' && access.writable && <button className={BUTTON} disabled={busy || pending || !!form} onClick={() => edit(r)}>Correct / void</button>}</td></tr>)}</tbody></table></div>{!entries.length && <p className="mt-3 text-sm text-gray-500">No saved entries for this selection.</p>}</Card>
    </>}
    <p className="text-xs text-gray-500">40 kg per bag follows the supplied reference. Save history is retained. This register does not change purchased waste or raw-material stock.</p>
  </section>;
}
