import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { useSharedEntry, useSharedEntryAccess, useConfirmSharedSave, useRefreshSharedEntry, useSharedEntriesPending } from '@/context/SharedEntriesContext';

const FIELDS = ['hdpeBlack', 'hdpeColor', 'hdpeClear', 'hdpePrinted', 'ldpeColor', 'ldpeClear', 'ldpePrinted', 'pp'] as const;
const LABELS = ['HDPE Black', 'HDPE Color', 'HDPE Clear', 'HDPE Printed', 'LDPE Color', 'LDPE Clear', 'LDPE Printed', 'PP Clear / Printed'];
const RATE_FIELDS = ['blackRate', 'clearLdRate', 'mixedRate', 'ppRate'] as const;
const RATE_LABELS = ['Black', 'Clear LD', 'Clear & Color', 'PP'];
const KEY = 'inhouse-waste-entries';
const RATES_KEY = 'inhouse-waste-rates';
const INPUT = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm';
const BUTTON = 'rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50';
type WasteItem = { id: string; name: string };
type Entry = { extraQuantities?: Record<string, string>; id: string; date: string; notes: string; status: 'Active' | 'Voided'; correctionReason: string } & Record<typeof FIELDS[number], string>;
type Rates = { customRates?: Record<string, string>; id: string; month: string; currency: string; correctionReason: string } & Record<typeof RATE_FIELDS[number], string>;
type Totals = Record<typeof FIELDS[number] | 'hdpeTotal' | 'ldpeTotal' | 'ppTotal' | 'total', string>;
type Report = { items: WasteItem[]; entries: (Entry & Totals)[]; totals: Totals; rates: Rates | null; valuation: { item: string; quantity: string; rate: string | null; amount: string | null }[]; amount: string | null; currency: string | null };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const display = (v: string) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 3 });
const errorMessage = (e: unknown) => { const data = (e as { response?: { data?: unknown } }).response?.data; return data ? JSON.stringify(data) : e instanceof Error ? e.message : 'Request failed. Please retry.'; };
export function InhouseWaste() {
  const [entries, setEntries] = useSharedEntry<Entry[]>(KEY, []);
  const [rates, setRates] = useSharedEntry<Rates[]>(RATES_KEY, []);
  const [items, setItems] = useSharedEntry<WasteItem[]>('inhouse-waste-items', []);
  const itemAccess = useSharedEntryAccess('inhouse-waste-items');
  const [addingItem, setAddingItem] = useState(false);
  const [itemName, setItemName] = useState('');
  const access = useSharedEntryAccess(KEY);
  const rateAccess = useSharedEntryAccess(RATES_KEY);
  const pending = useSharedEntriesPending();
  const confirm = useConfirmSharedSave();
  const refresh = useRefreshSharedEntry();
  const [month, setMonth] = useState(today().slice(0,7));
  const [attempt, setAttempt] = useState(0);
  const [report, setReport] = useState<Report | null>(null);
  const [form, setForm] = useState<Entry | null>(null);
  const [rateForm, setRateForm] = useState<Rates | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const editing = !!form && entries.some(row => row.id === form.id);
  const editingRates = !!rateForm && rates.some(row => row.id === rateForm.id);
  useEffect(() => {
    let active = true; setLoading(true); setReport(null); setError('');
    api.get<Report>('/recycling/inhouse-waste/report/', { params: { month } }).then(({data}) => { if(active) setReport(data); }).catch(e => { if(active) setError(errorMessage(e)); }).finally(() => { if(active) setLoading(false); });
    return () => { active = false; };
  }, [month, attempt]);
  const run = async (action: () => Promise<void>) => {
    if(busy || pending) return;
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch(e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const start = () => {
    setNotice('');
    setForm({ id: crypto.randomUUID(), date: today().startsWith(month) ? today() : month+'-01', notes: '', status: 'Active', correctionReason: '', ...Object.fromEntries(FIELDS.map(f => [f,'0'])) } as Entry);
  };
  const save = (event: FormEvent) => {
    event.preventDefault(); if(!form) return;
    void run(async () => {
      const row = { ...form, notes: form.notes.trim(), correctionReason: form.correctionReason.trim() };
      setEntries(previous => previous.some(r => r.id === row.id) ? previous.map(r => r.id === row.id ? row : r) : [...previous,row]);
      await confirm(); setForm(null); setMonth(row.date.slice(0,7)); setAttempt(n=>n+1); setNotice('Daily waste delivery saved.');
    });
  };
  const saveRates = (event: FormEvent) => {
    event.preventDefault(); if(!rateForm) return;
    void run(async () => {
      const row = { ...rateForm, currency: rateForm.currency.trim().toUpperCase(), correctionReason: rateForm.correctionReason.trim() };
      setRates(previous => previous.some(r => r.id === row.id) ? previous.map(r => r.id === row.id ? row : r) : [...previous,row]);
      await confirm(); setRateForm(null); setAttempt(n=>n+1); setNotice('Monthly rates saved.');
    });
  };
  const addItem = (event: FormEvent) => {
    event.preventDefault();
    const name = itemName.trim();
    if (!name || !itemAccess.writable) return;
    if ([...LABELS, ...RATE_LABELS, ...items.map(item => item.name)].some(value => value.toLowerCase() === name.toLowerCase())) { setError('This waste item already exists.'); return; }
    void run(async () => {
      setItems(previous => [...previous, { id: crypto.randomUUID(), name }]);
      await confirm(); setAddingItem(false); setItemName(''); setAttempt(n=>n+1); setNotice('Waste item saved. Enter its quantity and set its monthly rate.');
    });
  };
  const download = () => void run(async () => {
    await confirm();
    const {data} = await api.get<Blob>('/recycling/inhouse-waste/report/', { params: {month, export:'xlsx'}, responseType:'blob' });
    const url=URL.createObjectURL(data); const link=document.createElement('a'); link.href=url; link.download=`inhouse-waste-${month}.xlsx`; link.click(); window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  const locked = busy || pending;
  return <section className="mt-5 space-y-5" aria-label="In-house waste delivery">
    <h2 className="text-xl font-semibold text-navy">Module 4 · In-house Waste Delivery</h2>
    <p className="text-sm text-gray-500">Daily waste deliveries in kg, monthly material totals and valuation.</p>
    <Card><div className="flex flex-wrap items-end gap-3"><label>Reporting month<input className={INPUT} type="month" value={month} disabled={locked || !!form || !!rateForm} onChange={e=>{if(e.target.value) setMonth(e.target.value);}} /></label>
    <button className={BUTTON} disabled={locked || !itemAccess.writable || addingItem} onClick={()=>setAddingItem(true)}>Add waste item</button>
    <button className={BUTTON} disabled={locked || !access.writable || !!form} onClick={start}>Add daily delivery</button>
    <button className={BUTTON} disabled={locked || !rateAccess.writable || loading || !report || !!rateForm} onClick={()=>setRateForm(report?.rates ? {...report.rates, correctionReason:''} : { id:crypto.randomUUID(), month, currency:'', blackRate:'2000', clearLdRate:'2500', mixedRate:'2400', ppRate:'2500', correctionReason:'' })}>Set monthly rates</button>
    <button className={BUTTON} disabled={locked || loading || !!form || !!rateForm} onClick={()=>void run(async()=>{await refresh(KEY); await refresh(RATES_KEY); await refresh('inhouse-waste-items'); setAttempt(n=>n+1);})}>Refresh saved records</button>
    <button className={BUTTON} disabled={locked || loading || !report} onClick={download}>Download Excel</button></div></Card>
    {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-800">{error}</p>}{notice && <p role="status">{notice}</p>}
    {access.loaded && !access.writable && <p className="text-sm text-gray-500">Your account has read access.</p>}
    {addingItem && <Card><form aria-label="Add waste item" onSubmit={addItem} className="flex flex-wrap items-end gap-3"><label className="min-w-60 flex-1">Material / colour name<input className={INPUT} required maxLength={200} placeholder="e.g. HDPE Blue" value={itemName} disabled={locked} onChange={e=>setItemName(e.target.value)} /></label><button className={BUTTON} type="submit" disabled={locked}>Save waste item</button><button className={BUTTON} type="button" disabled={locked} onClick={()=>setAddingItem(false)}>Cancel item</button></form><p className="mt-3 text-sm text-gray-500">Each new item has its own quantity in kg and monthly rate. Saved names remain available for future deliveries.</p></Card>}
    {form && <Card><form onSubmit={save} aria-label="Daily waste delivery" className="space-y-4"><h3 className="font-semibold">{editing ? 'Correct / void delivery' : 'New daily delivery'}</h3><fieldset disabled={locked} className="space-y-4">
    <label className="block max-w-xs">Delivery date<input type="date" required className={INPUT} value={form.date} onChange={e=>setForm({...form,date:e.target.value})} /></label>
    {[['HDPE',FIELDS.slice(0,4)],['LDPE',FIELDS.slice(4,7)],['PP',FIELDS.slice(7)]] .map(([title, fields])=><div key={title as string}><h4 className="font-medium text-navy">{title}</h4><div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(fields as typeof FIELDS[number][]).map(f=><label key={f} className="text-sm">{LABELS[FIELDS.indexOf(f)]} (kg)<input className={INPUT} type="number" min="0" max="1000000000" step="0.001" required value={form[f]} onChange={e=>setForm({...form,[f]:e.target.value})} /></label>)}</div></div>)}
    {!!items.length && <div><h4 className="font-medium text-navy">Additional waste items</h4><div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{items.map(item=><label key={item.id}>{item.name} (kg)<input className={INPUT} required type="number" min="0" max="1000000000" step="0.001" value={form.extraQuantities?.[item.id] ?? '0'} onChange={e=>setForm({...form,extraQuantities:{...form.extraQuantities,[item.id]:e.target.value}})} /></label>)}</div></div>}
    <p className="text-xs text-gray-500">Enter the combined daily quantity in each field. Enter 0 when none was delivered. Totals are calculated on save.</p>
    <label className="block">Notes<textarea className={INPUT} maxLength={1000} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} /></label>
    {editing && <div className="grid gap-3 sm:grid-cols-2"><label>Status<select className={INPUT} value={form.status} onChange={e=>setForm({...form,status:e.target.value as Entry['status']})}><option>Active</option><option>Voided</option></select></label><label>Correction / void reason<textarea className={INPUT} required maxLength={500} value={form.correctionReason} onChange={e=>setForm({...form,correctionReason:e.target.value})} /></label></div>}
    </fieldset><button className={BUTTON} disabled={locked} type="submit">Save delivery</button> <button type="button" className={BUTTON} disabled={locked} onClick={()=>setForm(null)}>Cancel</button></form></Card>}
    {rateForm && <Card><form aria-label="Monthly waste rates" onSubmit={saveRates} className="space-y-4"><h3 className="font-semibold">Valuation rates / kg · {rateForm.month}</h3><p className="text-sm text-gray-500">Initial suggestions follow the reference sheet. Confirm the rates and currency for this month.</p><fieldset disabled={locked} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label>Currency code<input className={INPUT} required pattern="[A-Za-z]{3}" maxLength={3} placeholder="e.g. UGX" value={rateForm.currency} onChange={e=>setRateForm({...rateForm,currency:e.target.value})} /></label>{RATE_FIELDS.map((f,i)=><label key={f}>{RATE_LABELS[i]} rate / kg<input className={INPUT} required type="number" min="0" max="1000000000" step="0.0001" value={rateForm[f]} onChange={e=>setRateForm({...rateForm,[f]:e.target.value})} /></label>)}{items.map(item=><label key={item.id}>{item.name} rate / kg<input className={INPUT} required type="number" min="0" max="1000000000" step="0.0001" value={rateForm.customRates?.[item.id] ?? ''} onChange={e=>setRateForm({...rateForm,customRates:{...rateForm.customRates,[item.id]:e.target.value}})} /></label>)}{editingRates && <label>Correction reason<textarea className={INPUT} required maxLength={500} value={rateForm.correctionReason} onChange={e=>setRateForm({...rateForm,correctionReason:e.target.value})} /></label>}</fieldset><button type="submit" className={BUTTON} disabled={locked}>Save monthly rates</button> <button type="button" className={BUTTON} disabled={locked} onClick={()=>setRateForm(null)}>Cancel rates</button></form></Card>}
    {loading && <p role="status">Loading waste deliveries…</p>}
    {report && <><div className="grid gap-3 sm:grid-cols-4">{(['hdpeTotal','ldpeTotal','ppTotal','total'] as const).map((f,i)=><Card key={f}><p className="text-sm text-gray-500">{['HDPE','LDPE','PP','All waste'][i]}</p><strong>{display(report.totals[f])} kg</strong></Card>)}</div>
    <Card><h3 className="font-semibold">Monthly valuation {report.currency ? `· ${report.currency}` : ''}</h3>{report.amount === null && <p className="mt-2 text-sm text-amber-700">Set monthly rates and currency, including rates for additional items with deliveries, to calculate amounts.</p>}<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Item','Rate / kg','Total quantity kg','Amount'].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{report.valuation.map(r=><tr key={r.item} className="border-t"><td className="p-3">{r.item}</td><td className="p-3">{r.rate === null ? 'Not set' : display(r.rate)}</td><td className="p-3">{display(r.quantity)}</td><td className="p-3">{r.amount === null ? 'Not calculated' : display(r.amount)}</td></tr>)}</tbody><tfoot><tr className="border-t font-semibold"><td className="p-3" colSpan={2}>Total</td><td className="p-3">{display(report.totals.total)}</td><td className="p-3">{report.amount === null ? 'Not calculated' : display(report.amount)}</td></tr></tfoot></table></div><p className="mt-3 text-xs text-gray-500">Black = HDPE Black. Clear LD = LDPE Clear. Clear &amp; Color = HDPE Color + Clear + Printed, LDPE Color + Printed. PP = Clear / Printed.</p></Card>
    <Card><h3 className="font-semibold">Daily delivery register · {month}</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Date',...LABELS,'HDPE total','LDPE total','PP total','Total kg',...report.items.map(item=>item.name+' kg'),'Status / notes',''].map((h,i)=><th className="whitespace-nowrap p-3" key={i}>{h}</th>)}</tr></thead><tbody>{report.entries.map(r=><tr key={r.id} className="border-t"><td className="whitespace-nowrap p-3">{r.date}</td>{[...FIELDS,'hdpeTotal','ldpeTotal','ppTotal','total'].map(f=><td className="p-3" key={f}>{display(r[f as keyof Totals])}</td>)}{report.items.map(item=><td className="p-3" key={item.id}>{display(r.extraQuantities?.[item.id] ?? '0')}</td>)}<td className="p-3">{r.status}<p>{r.notes}</p><p>{r.correctionReason}</p></td><td className="p-3">{r.status === 'Active' && access.writable && <button className={BUTTON} disabled={locked || !!form} onClick={()=>{ const {hdpeTotal,ldpeTotal,ppTotal,total,...entry}=r; setForm({...entry,correctionReason:''}); }}>Correct / void</button>}</td></tr>)}</tbody><tfoot><tr className="border-t font-semibold"><td className="p-3">Active totals</td>{[...FIELDS,'hdpeTotal','ldpeTotal','ppTotal','total'].map(f=><td className="p-3" key={f}>{display(report.totals[f as keyof Totals])}</td>)}{report.items.map(item=><td className="p-3" key={item.id}>{display(report.valuation.find(row=>row.item===item.name)?.quantity ?? '0')}</td>)}</tr></tfoot></table></div>{!report.entries.length && <p className="mt-3 text-sm text-gray-500">No daily deliveries recorded this month.</p>}</Card></>}
    <p className="text-xs text-gray-500">One active sheet per day. Voided sheets remain visible and do not affect totals. Valuation records no payment or inventory posting.</p>
  </section>;
}
