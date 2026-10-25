import { useEffect, useRef, useState } from 'react';
import { datedProcurementMetrics, procurementEditPlan, validatePlan, type ProcurementItem } from '@/lib/procurement';

import { today } from '@/lib/salesOrders';

const field='mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2';
const numberText=(n:number)=>Number.isFinite(n)?String(Number(n.toFixed(6))):'';
const display=(n:number|null)=>n===null?'Unknown':n.toLocaleString(undefined,{maximumFractionDigits:3});

export function ProcurementPlanEditor({initial,items,date,demo,onSave,onClose}:{
  initial:ProcurementItem; items:ProcurementItem[];
  date:string; demo:boolean; onSave:(plan:ProcurementItem)=>Promise<void>; onClose:()=>void;
}){
  const [draft,setDraft]=useState(()=>procurementEditPlan(initial,today()));
  const [stock,setStock]=useState(()=>{const remaining=procurementEditPlan(initial,today()).stock;return remaining===null?'':String(remaining);});
  const [stockDate,setStockDate]=useState(()=>initial.asOfDate??today());
  const [daily,setDaily]=useState(numberText(initial.monthly/initial.days));
  const [monthly,setMonthly]=useState(String(initial.monthly));
  const [days,setDays]=useState(String(initial.days)),[lead,setLead]=useState(String(initial.lead));
  const [saving,setSaving]=useState(false),[error,setError]=useState('');
  const basis=useRef<'daily'|'monthly'>('monthly');
  const dialog=useRef<HTMLDivElement>(null),locked=useRef(false),close=useRef(onClose);close.current=onClose;
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';dialog.current?.querySelector<HTMLSelectElement>('select')?.focus();
    const keydown=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();if(!locked.current)close.current();}
      if(e.key==='Tab'){
        const controls=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')??[]);
        const first=controls[0],last=controls.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    };
    document.addEventListener('keydown',keydown);
    return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',keydown);previous?.focus();};
  },[]);
  function selectMaterial(id:string){
    const selected=items.find(p=>p.materialId===id);if(!selected)return;
    const item=procurementEditPlan(selected,today());
    setDraft(structuredClone(item));setMonthly(String(item.monthly));setDaily(numberText(item.monthly/item.days));
    setDays(String(item.days));setLead(String(item.lead));setStock(item.stock===null?'':String(item.stock));setStockDate(item.asOfDate??today());basis.current='monthly';setError('');
  }
  const monthlyValue=basis.current==='daily'?Number(daily)*Number(days):Number(monthly);
  const plan={...draft,stock:stock===''?null:Number(stock),asOfDate:stockDate,monthly:Number(monthlyValue.toFixed(6)),days:Number(days),lead:Number(lead)};
  let preview:ReturnType<typeof datedProcurementMetrics>|null=null;
  try{preview=datedProcurementMetrics(plan,date);}catch{/* Invalid edits are reported on save. */}
  async function submit(e:React.FormEvent){
    e.preventDefault();if(locked.current)return;setError('');
    try{
      validatePlan(plan);if(stockDate>today())throw new Error('Stock date cannot be in the future.');locked.current=true;setSaving(true);await onSave(plan);onClose();
    }catch(err){setError(err instanceof Error?err.message:'Unable to save this plan.');}
    finally{locked.current=false;setSaving(false);}
  }
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4" onMouseDown={e=>{if(e.target===e.currentTarget&&!locked.current)onClose();}}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="procurement-plan-title" className="mx-auto my-6 max-w-3xl space-y-4 rounded-xl bg-white p-6">
      <h2 id="procurement-plan-title" className="text-xl font-semibold text-navy">Add / edit procurement plan</h2>
      <p className="text-sm text-gray-600">Select a material name and enter procurement stock and daily or monthly consumption here. The other value is calculated using consumption days per month.</p>
      <form onSubmit={submit}><fieldset disabled={saving} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">Raw material / grade<select required className={field} value={draft.materialId} onChange={e=>selectMaterial(e.target.value)}>{items.map(p=><option key={p.id} value={p.materialId}>{p.name} ({p.unit})</option>)}</select></label>
          <section aria-labelledby="procurement-stock-heading" className="rounded-lg border border-blue-200 bg-blue-50 p-4 sm:col-span-2">
            <h3 id="procurement-stock-heading" className="mb-3 font-semibold text-navy">Enter your procurement stock</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="procurement-stock" className="block font-medium text-gray-900">Stock in Store ({draft.unit})</label>
                <input id="procurement-stock" name="stock" aria-describedby="procurement-stock-help" type="number" min="0" step="0.000001" placeholder="Enter stock quantity" className={`${field} min-h-12 border-blue-400 text-lg text-gray-900`} value={stock} onChange={e=>setStock(e.target.value)}/>
                <p id="procurement-stock-help" className="mt-1 text-xs text-gray-600">New plans prefill from Raw Material for your review. Saved plans keep the stock you entered until you update it manually. Consumption figures never reduce this balance. Blank means unknown.</p>
              </div>
              <label className="block font-medium text-gray-900">Stock date<input required type="date" max={today()} className={field} value={stockDate} onChange={e=>setStockDate(e.target.value)}/></label>
            </div>
          </section>
          <label>Daily Consumption ({draft.unit})<input required type="number" min="0" step="0.000001" className={field} value={daily} onChange={e=>{basis.current='daily';setDaily(e.target.value);setMonthly(e.target.value===''?'':numberText(Number(e.target.value)*Number(days)));}}/></label>
          <label>Monthly Consumption ({draft.unit})<input required type="number" min="0" step="0.000001" className={field} value={monthly} onChange={e=>{basis.current='monthly';setMonthly(e.target.value);setDaily(e.target.value===''?'':numberText(Number(e.target.value)/Number(days)));}}/></label>
          <label>Consumption days per month<input required type="number" min="1" max="31" step="1" className={field} value={days} onChange={e=>{setDays(e.target.value);if(basis.current==='daily')setMonthly(numberText(Number(daily)*Number(e.target.value)));else setDaily(numberText(Number(monthly)/Number(e.target.value)));}}/></label>
          <label>Remaining stock on {date}<input readOnly className={`${field} bg-gray-50`} value={display(preview?.stock??null)}/></label>
          <label>Number of days covered<input readOnly className={`${field} bg-gray-50`} value={preview?.coverage===null||!preview?'Not available':display(preview.coverage)}/></label>
          <label>Stock upto<input readOnly className={`${field} bg-gray-50`} value={preview?.stockUpto??'Not available'}/></label>
          <label>Next Order Cycle (days)<input required type="number" min="0" max="3650" step="1" className={field} value={lead} onChange={e=>setLead(e.target.value)}/><span className="text-xs text-gray-500">75 days each cycle by default.</span></label>
          <label>Next order date<input readOnly className={`${field} bg-gray-50`} value={preview?.reorder??'Not available'}/></label>
          <label className="sm:col-span-2">Comment<textarea className={field} maxLength={5000} rows={2} value={draft.comment} onChange={e=>setDraft({...draft,comment:e.target.value})}/></label>
        </div>
        <p className="rounded bg-sky-50 p-3 text-sm text-sky-900">Daily and monthly consumption are planning estimates only. Coverage = entered stock / daily consumption. Estimated availability starts from the stock date. Stock stays as entered until you manually update it; saving this plan does not change Raw Material or finished-goods Stock.</p>
        <h3 className="font-semibold">Expected deliveries</h3>
        {draft.deliveries.map((d,i)=><div className="grid gap-2 sm:grid-cols-4" key={d.id}>
          <label className="text-sm">Supplier<input required className={field} maxLength={250} value={d.supplier} onChange={e=>setDraft({...draft,deliveries:draft.deliveries.map((x,j)=>j===i?{...x,supplier:e.target.value}:x)})}/></label>
          <label className="text-sm">Arrival date<input required className={field} type="date" value={d.date} onChange={e=>setDraft({...draft,deliveries:draft.deliveries.map((x,j)=>j===i?{...x,date:e.target.value}:x)})}/></label>
          <label className="text-sm">Quantity ({draft.unit})<input required className={field} type="number" min="0.000001" step="0.000001" value={d.quantity} onChange={e=>setDraft({...draft,deliveries:draft.deliveries.map((x,j)=>j===i?{...x,quantity:Number(e.target.value)}:x)})}/></label>
          <button type="button" className="self-end py-2 text-red-700" onClick={()=>setDraft({...draft,deliveries:draft.deliveries.filter(x=>x.id!==d.id)})}>Remove</button>
        </div>)}
        <button type="button" className="text-navy underline" onClick={()=>setDraft({...draft,deliveries:[...draft.deliveries,{id:crypto.randomUUID(),supplier:'',date:'',quantity:0}]})}>Add delivery</button>
        {error&&<p role="alert" className="text-red-700">{error}</p>}
        <div className="flex justify-end gap-3 flex-wrap max-w-full"><button type="button" className="rounded border px-4 py-2" onClick={onClose}>Cancel</button><button type="submit" className="rounded bg-navy px-4 py-2 text-white">{saving?'Saving...':demo?'Apply to demo session':'Save procurement plan'}</button></div>
      </fieldset></form>
    </div>
  </div>;
}
