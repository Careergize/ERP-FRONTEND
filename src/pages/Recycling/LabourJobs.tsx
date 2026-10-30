import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { useSharedEntry, useSharedEntryAccess, useConfirmSharedSave, useRefreshSharedEntry, useSharedEntriesPending } from '@/context/SharedEntriesContext';

const DIRECTIONS = ['IN', 'OUT'];
const KEY = 'labour-job-entries';
const INPUT = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm';
const BUTTON = 'rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50';
type LabourOption = { id: string; kind: 'material' | 'color'; name: string };

type LabourEntry = { id: string; date: string; material: string; customer: string; quantity: string; color: string; direction: string; notes: string; status: 'Active' | 'Voided'; correctionReason: string };
type Report = { month: string; version: number; entries: LabourEntry[]; summary: {customer: string; material: string; color: string; opening: string; quantityIn: string; quantityOut: string; closing: string}[]; quantityIn: string; quantityOut: string };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const display = (value: string) => Number(value).toLocaleString('en-UG', { maximumFractionDigits: 4 });
const message = (error: unknown) => {
  const detail = (error as { response?: { data?: unknown } }).response?.data;
  return detail ? JSON.stringify(detail) : error instanceof Error ? error.message : 'The request failed. Please retry.';
};

export function LabourJobs() {
  const [savedEntries, setEntries] = useSharedEntry<LabourEntry[]>(KEY, []);
  const [options, setOptions] = useSharedEntry<LabourOption[]>('labour-job-options', []);
  const optionAccess = useSharedEntryAccess('labour-job-options');
  const [optionKind, setOptionKind] = useState<'material' | 'color' | null>(null);
  const [optionName, setOptionName] = useState('');
  const access = useSharedEntryAccess(KEY);
  const confirm = useConfirmSharedSave();
  const refresh = useRefreshSharedEntry();
  const pending = useSharedEntriesPending();
  const [filters, setFilters] = useState({ customer: '', material: '', color: '' });
  const [month, setMonth] = useState(today().slice(0, 7));
  const [report, setReport] = useState<Report | null>(null);
  const [form, setForm] = useState<LabourEntry | null>(null);
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
    api.get<Report>('/recycling/labour-jobs/report/', { params: { month } }).then(({ data }) => {
      if (active) setReport(data);
    }).catch(cause => { if (active) setError(message(cause)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month, attempt]);

  const reload = useCallback(async () => {
    if (pending) return;
    try { setError(''); await refresh(KEY); await refresh('labour-job-options');  setAttempt(n => n+1); }
    catch (cause) { setError(message(cause)); }
  }, [pending, refresh]);

  const start = () => {
    setEditing(false); setError(''); setNotice('');
    setForm({ id: crypto.randomUUID(), date: today().startsWith(month) ? today() : month+'-01', material: '', customer: '', quantity: '', color: '', direction: 'IN', notes: '', status: 'Active', correctionReason: '' });
  };
  const addOption = async (event: FormEvent) => {
    event.preventDefault();
    const name = optionName.trim();
    if (!optionKind || !name || busy || pending || !optionAccess.writable) return;
    if (choices(optionKind).some(value => value.toLowerCase() === name.toLowerCase())) {
      setError('This option already exists. Choose it from the list.'); return;
    }
    setBusy(true); setError(''); setNotice('');
    try {
      setOptions(previous => [...previous, { id: crypto.randomUUID(), kind: optionKind, name }]);
      await confirm();
      setForm(previous => previous ? { ...previous, [optionKind]: name } : previous);
      setOptionKind(null); setOptionName('');
      setNotice(`${optionKind === 'material' ? 'Material' : 'Colour'} “${name}” saved for future entries.`);
    } catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  };
  const edit = (entry: LabourEntry) => {
    setForm({ ...entry, correctionReason: '' }); setEditing(true); setError(''); setNotice('');
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form || busy || pending) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const entry = { ...form, customer: form.customer.trim(), material: form.material.trim(), color: form.color.trim(), notes: form.notes.trim(), correctionReason: form.correctionReason.trim() };
      setEntries(previous => previous.some(r => r.id === entry.id) ? previous.map(r => r.id === entry.id ? entry : r) : [...previous, entry]);
      await confirm();
      setForm(null); setMonth(entry.date.slice(0,7)); setAttempt(n => n+1);
      setNotice('Labour job entry saved to the database.');
    } catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  };
  const download = async (format: 'xlsx') => {
    setExporting(true); setError('');
    try {
      await confirm();
      const { data } = await api.get<Blob>('/recycling/labour-jobs/report/', { params: { month, export: format }, responseType: 'blob' });
      const url = URL.createObjectURL(data); const link = document.createElement('a');
      link.href = url; link.download = `labour-job-${month}.${format}`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(message(cause)); }
    finally { setExporting(false); }
  };
  const update = (key: keyof LabourEntry, value: string) => setForm(previous => previous ? { ...previous, [key]: value } : previous);
  const matches = (row: { customer: string; material: string; color: string }) =>
    (['customer', 'material', 'color'] as const).every(key => !filters[key] || row[key] === filters[key]);
  const entries = (report?.entries ?? []).filter(matches);
  const summary = (report?.summary ?? []).filter(matches);
  const choices = (key: 'customer' | 'material' | 'color') =>
    [...new Set([...(report?.summary ?? []).map(row => row[key]), ...savedEntries.map(row => row[key]), ...options.filter(row => row.kind === key).map(row => row.name)])].sort((a, b) => a.localeCompare(b));
  const filtered = Object.values(filters).some(Boolean);
  return <section className="mt-5 space-y-5" aria-label="Labour Job">
    <h2 className="text-xl font-semibold text-navy">Module 3 · Labour Job</h2>
    <p className="text-sm text-gray-500">Customer material IN and OUT, in kg.</p>
    <Card><div className="flex flex-wrap items-end gap-3"><label>Reporting month<input className={INPUT} type="month" value={month} disabled={busy || !!form} onChange={e => { if(e.target.value) setMonth(e.target.value); }} /></label><button className={BUTTON} disabled={!access.writable || pending || busy || !!form} onClick={start}>Add entry</button><button className={BUTTON} disabled={pending || busy || loading || !!form} onClick={() => void reload()}>Refresh saved records</button><button className={BUTTON} disabled={pending || exporting || loading || !report} onClick={() => void download('xlsx')}>Download Excel</button></div></Card>
    <Card><div className="grid gap-3 sm:grid-cols-3" aria-label="Filter labour job records">
      {(['customer', 'material', 'color'] as const).map(key => <label key={key}>{key === 'customer' ? 'Customer' : key === 'material' ? 'Material type' : 'Colour'}<select className={INPUT} value={filters[key]} onChange={event => setFilters(previous => ({ ...previous, [key]: event.target.value }))}><option value="">All {key === 'color' ? 'colours' : key === 'material' ? 'materials' : 'customers'}</option>{[...new Set([...choices(key), ...(filters[key] ? [filters[key]] : [])])].map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}
    </div>{filtered && <button className={`${BUTTON} mt-3`} onClick={() => setFilters({ customer: '', material: '', color: '' })}>Clear filters</button>}<p className="mt-3 text-xs text-gray-500">Filters narrow the summary and registers. Monthly totals and Excel include all records for the month.</p></Card>
    {(['customer', 'material', 'color'] as const).map(key => <datalist key={key} id={`labour-${key}-choices`}>{choices(key).map(value => <option key={value} value={value} />)}</datalist>)}
    {error && <p role="alert" className="p-3 text-red-800 bg-red-50">{error}</p>}{notice && <p role="status">{notice}</p>}
    {access.loaded && !access.writable && <p>Your account has read access.</p>}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
    <div>
    {form && <Card><form aria-label="Labour job entry" onSubmit={e => void save(e)} className="space-y-4"><h3>{editing ? 'Correct / void entry' : 'New labour job entry'}</h3><fieldset disabled={busy || pending} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><label>Date<input className={INPUT} type="date" required value={form.date} onChange={e => update('date',e.target.value)} /></label><label>Movement<select className={INPUT} value={form.direction} onChange={e => update('direction',e.target.value)}>{DIRECTIONS.map(v => <option key={v} value={v}>Material {v}</option>)}</select></label>
    {(['customer','material','color'] as const).map(k => <label key={k}>{k === 'customer' ? 'Customer' : k === 'material' ? 'Material type' : 'Colour'}<input className={INPUT} list={`labour-${k}-choices`} required maxLength={200} value={form[k]} onChange={e => update(k,e.target.value)} /></label>)}
    <label>Quantity (kg)<input className={INPUT} required type="number" min="0.001" step="0.001" max="1000000000" value={form.quantity} onChange={e => update('quantity',e.target.value)} /></label><label>Notes<textarea className={INPUT} maxLength={1000} value={form.notes} onChange={e => update('notes',e.target.value)} /></label>
    {editing && <><label>Status<select className={INPUT} value={form.status} onChange={e => update('status',e.target.value)}><option>Active</option><option>Voided</option></select></label><label>Correction / void reason<textarea className={INPUT} required maxLength={500} value={form.correctionReason} onChange={e => update('correctionReason',e.target.value)} /></label></>}
    </fieldset><button className={BUTTON} disabled={busy || pending} type="submit">{busy ? 'Saving…' : 'Save entry'}</button> <button className={BUTTON} disabled={busy || pending} type="button" onClick={() => setForm(null)}>Cancel</button></form></Card>}
    </div><Card><h3 className="font-semibold text-navy">Materials &amp; colours</h3><p className="mt-2 text-sm text-gray-500">Add reusable options here, then choose them in the entry form.</p>
    <div className="mt-4 flex flex-wrap gap-2">{(['material', 'color'] as const).map(kind => <button type="button" key={kind} className={BUTTON} disabled={!optionAccess.writable || busy || pending} onClick={() => { setOptionKind(kind); setOptionName(''); setError(''); }}>Add {kind === 'material' ? 'material' : 'colour'}</button>)}</div>
    {optionKind && <form className="mt-4 space-y-3" aria-label={`Add labour job ${optionKind === 'material' ? 'material' : 'colour'}`} onSubmit={event => void addOption(event)}><label className="block text-sm">New {optionKind === 'material' ? 'material' : 'colour'}<input className={INPUT} required maxLength={200} value={optionName} disabled={busy || pending} onChange={event => setOptionName(event.target.value)} /></label><button className={BUTTON} disabled={busy || pending} type="submit">Save {optionKind === 'material' ? 'material' : 'colour'}</button> <button className={BUTTON} disabled={busy || pending} type="button" onClick={() => setOptionKind(null)}>Cancel</button></form>}
    <div className="mt-4 space-y-3">{(['material', 'color'] as const).map(kind => <div key={kind}><h4 className="text-sm font-medium">{kind === 'material' ? 'Materials' : 'Colours'}</h4><div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto">{choices(kind).map(name => <span className="rounded bg-gray-100 px-2 py-1 text-xs" key={name}>{name}</span>)}{!choices(kind).length && <p className="text-sm text-gray-500">No options yet.</p>}</div></div>)}</div>
    </Card></div>
    {loading && <p role="status">Loading saved entries…</p>}
    {report && <><div className="grid gap-3 sm:grid-cols-2"><Card>Monthly IN: <strong>{display(report.quantityIn)} kg</strong></Card><Card>Monthly OUT: <strong>{display(report.quantityOut)} kg</strong></Card></div><Card><h3 className="font-semibold">Customer material summary</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Customer','Material type','Colour','Recorded opening kg','IN kg','OUT kg','Recorded closing kg'].map(h => <th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{summary.map(r => <tr className="border-t" key={JSON.stringify([r.customer,r.material,r.color])}>{[r.customer,r.material,r.color,...[r.opening,r.quantityIn,r.quantityOut,r.closing].map(display)].map((v,i) => <td className="p-3" key={i}>{v}</td>)}</tr>)}</tbody></table></div>{!summary.length && <p className="mt-3 text-sm text-gray-500">{filtered ? 'No balances match these filters.' : 'No recorded balances for this month.'}</p>}<p className="mt-3 text-xs text-gray-500">Balances use recorded entries only. Earlier unrecorded material is unknown; negative balances need reconciliation. Customer, material and colour stay separate.</p></Card>
    <div className="grid gap-5 xl:grid-cols-2">{['IN','OUT'].map(d => <Card key={d}><h3 className="font-semibold">Material {d}</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Date','Customer','Material type','Colour','Qty kg','Status',''].map((h,i) => <th className="p-3" key={i}>{h}</th>)}</tr></thead><tbody>{entries.filter(r => r.direction === d).map(r => <tr className="border-t" key={r.id}><td className="p-3 whitespace-nowrap">{r.date}</td><td className="p-3">{r.customer}</td><td className="p-3">{r.material}</td><td className="p-3">{r.color}</td><td className="p-3">{display(r.quantity)}</td><td className="p-3">{r.status}<p className="text-xs">{r.notes}</p><p className="text-xs">{r.correctionReason}</p></td><td className="p-3">{r.status === 'Active' && access.writable && <button className={BUTTON} disabled={busy || pending || !!form} onClick={() => edit(r)}>Correct / void</button>}</td></tr>)}</tbody></table></div>{!entries.some(r => r.direction === d) && <p className="mt-3 text-sm text-gray-500">{filtered ? 'No entries match these filters this month.' : 'No entries this month.'}</p>}</Card>)}</div></>}
    <p className="text-xs text-gray-500">Customer-owned material register. Labour charges and company stock postings are separate workflows. Voided entries remain visible and are excluded from balances.</p>
  </section>;
}
