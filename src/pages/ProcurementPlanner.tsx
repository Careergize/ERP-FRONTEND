import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { useProcurement } from '@/lib/useProcurement';
import { ProcurementPlanEditor } from './ProcurementPlanEditor';
import { datedProcurementMetrics, procurementChoices, type ProcurementItem } from '@/lib/procurement';
import { today } from '@/lib/salesOrders';

const fmt=(n:number|null)=>n===null?'Unknown':n.toLocaleString(undefined,{maximumFractionDigits:3});
const field='rounded border border-gray-300 px-3 py-2 w-full bg-white';
export function ProcurementPlanner(){
  const {materials:rawMaterials,plans:rawPlans,loading:rawLoading,error:rawError,reload:reloadRaw,canPlan:rawCanPlan,save:saveRawPlan}=useProcurement();
  const {user}=useAuth();
  const demo=user?.id.startsWith('demo-');
  const items=procurementChoices(rawMaterials,rawPlans);
  const [notice,setNotice]=useState('');
  const [date,setDate]=useState(today),[search,setSearch]=useState(''),[onlyUrgent,setOnlyUrgent]=useState(false);
  const [draft,setDraft]=useState<ProcurementItem|null>(null);
  const lastToday=useRef(today());
  useEffect(()=>{
    const tick=()=>{const next=today();setDate(current=>current===lastToday.current?next:current);lastToday.current=next;};
    const timer=window.setInterval(tick,60000);window.addEventListener('focus',tick);
    return()=>{window.clearInterval(timer);window.removeEventListener('focus',tick);};
  },[]);
  const rows=rawPlans.map(item=>({item,monthlyPlan:item.monthly,...datedProcurementMetrics(item,date)}));
  const urgent=rows.filter(r=>['Order now','Out of stock'].includes(r.status));
  const visible=rows.filter(r=>r.item.name.toLowerCase().includes(search.toLowerCase())&&(!onlyUrgent||urgent.includes(r)));
  if(rawLoading)return <p role="status" className="p-6">Loading saved procurement plans...</p>;
  if(rawError)return <Card><p role="alert">{rawError}</p><button className="mt-3 underline" onClick={()=>void reloadRaw()}>Reload procurement plans</button></Card>;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold text-navy">Procurement planner</h1><p className="text-gray-500">Stock, consumption and your next order cycle</p></div>
      <div className="flex flex-wrap gap-3"><button disabled={!rawCanPlan||!items.length} className="rounded bg-navy px-4 py-2 text-white disabled:opacity-50" onClick={()=>{setNotice('');setDraft(structuredClone(items.find(p=>!rawPlans.some(saved=>saved.materialId===p.materialId))??items[0]));}}>Add procurement plan</button></div>
    </div>
    {!rawCanPlan&&<p role="status" className="text-sm text-amber-700">Your account has read-only access. A user with procurement plan permission can add or edit plans.</p>}
    {notice&&<p role="status" className="rounded bg-green-50 p-3 text-green-800">{notice}</p>}
    <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">Enter stock and estimated consumption manually. Daily and monthly consumption show how long the entered stock may last; they never reduce stock automatically. {demo?'Demo entries reset on refresh.':'Your entered stock and planning figures are saved in the database.'}</p>
    <button className="text-navy underline" onClick={()=>void reloadRaw()}>Reload saved procurement plans</button>
    <div className="grid gap-4 sm:grid-cols-3">{[['Materials tracked',rows.length],['Order now / out of stock',urgent.length],['Stock unknown',rows.filter(r=>r.stock===null).length]].map(([label,value])=><Card key={label}><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-3xl font-semibold text-navy">{value}</p></Card>)}</div>
    <Card><div className="flex flex-wrap items-end gap-4"><label>Planning date<input aria-label="Planning date" type="date" className={field} value={date} onChange={e=>{if(e.target.value)setDate(e.target.value);}}/></label><label>Find material<input className={field} placeholder="Search materials…" value={search} onChange={e=>setSearch(e.target.value)}/></label><label className="py-2"><input type="checkbox" checked={onlyUrgent} onChange={e=>setOnlyUrgent(e.target.checked)}/> Needs ordering</label></div></Card>
    <Card><div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="bg-gray-50"><tr>{['Material / Unit','Stock in Store','Daily Consumption','Monthly Consumption','Estimated days covered','Estimated stock until','Next Order Cycle','Comment','Status','Actions'].map(h=><th key={h} className="p-3 align-top"><span className="block whitespace-nowrap">{h}</span>{h==='Next Order Cycle'&&<span className="block text-xs font-normal text-gray-500">75 days each cycle by default</span>}</th>)}</tr></thead>
      <tbody>{visible.map(r=><tr key={r.item.id} className="border-t align-top">
        <td className="p-3"><strong>{r.item.name}</strong><p className="text-xs text-gray-500">{r.item.unit} · Procurement stock</p></td>
        <td className="p-3">{fmt(r.stock)}<p className="mt-1 text-xs text-gray-500">Stock date: {r.item.asOfDate??date}</p></td>
        <td className="p-3">{fmt(r.daily)}</td>
        <td className="p-3">{fmt(r.monthlyPlan)}</td>
        <td className="p-3">{r.coverage===null?'—':fmt(r.coverage)}</td>
        <td className="whitespace-nowrap p-3">{r.stockUpto??'—'}</td>
        <td className="p-3"><strong>{r.item.lead} days</strong><p className="mt-1 whitespace-nowrap text-xs text-gray-500">Order by: {r.reorder??'—'}</p></td>
        <td className="min-w-[150px] whitespace-pre-wrap p-3">{r.item.comment||'—'}</td>
        <td className="p-3"><span className={urgent.includes(r)?'font-semibold text-red-700':'text-gray-600'}>{r.status}</span></td>
        <td className="p-3"><button disabled={!rawCanPlan} className="whitespace-nowrap text-navy underline disabled:opacity-50" onClick={()=>{setNotice('');setDraft(structuredClone(items.find(p=>p.materialId===r.item.materialId)??r.item));}}>{rawPlans.some(p=>p.materialId===r.item.materialId)?'Edit plan':'Add plan'}</button></td>
      </tr>)}</tbody>
    </table>{visible.length===0&&<p className="p-5 text-gray-500">No procurement plans yet or no matching plans. Use Add procurement plan to enter stock and consumption.</p>}</div></Card>
    <Card><h2 className="text-lg font-semibold text-navy">Expected deliveries</h2><p className="mb-3 text-sm text-gray-500">Only arrivals before stock runs out extend continuous cover. Update procurement stock when a delivery is actually received; expected quantities are forecasts only.</p>{rows.every(r=>!r.deliveries.length)?<p>No expected deliveries yet. Add supplier, quantity and arrival date using Add procurement plan or Edit plan.</p>:rows.filter(r=>r.deliveries.length).map(r=><div key={r.item.id} className="border-t py-3"><strong>{r.item.name}</strong><p className="text-sm">Continuous cover including on-time deliveries: {r.continuous===null?'Unknown':`${fmt(r.continuous)} days`}</p>{r.deliveries.map(d=><p className="mt-1 text-sm" key={d.id}>{d.date} · {d.supplier} · {fmt(d.quantity)} {r.item.unit} · <span className={d.status==='On time'?'text-green-700':'text-red-700'}>{d.status}</span></p>)}</div>)}</Card>
    <p className="text-sm text-gray-500">Daily consumption = monthly consumption / consumption days. Estimated coverage = manually entered stock / daily consumption. Estimated stock-until and order-by dates are measured from the saved stock date. Update the stock quantity and date when you record a new count. Consumption figures and expected deliveries never change stock automatically.</p>
    {draft&&<ProcurementPlanEditor initial={draft} items={items} date={date} demo={!!demo} onClose={()=>setDraft(null)} onSave={async plan=>{await saveRawPlan(plan);setNotice(demo?'Plan applied to the demo session.':`Procurement plan saved for ${plan.name}.`);}}/>}
  </div>;
}
