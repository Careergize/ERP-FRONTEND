import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { financeErrorMessage } from '@/lib/financeApiErrors';

type Item={id:string;name:string;unit:string;valuedUnit:string|null;lastDate:string|null};
export function FinanceValuationItem({value,onChange,inputClass}:{value:string;onChange:(item:string,unit:string)=>void;inputClass:string}){
  const [items,setItems]=useState<Item[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  useEffect(()=>{let live=true;setLoading(true);setError('');
    void api.get<Item[]>('/accounting/valuation-items/').then(({data})=>{if(live)setItems(data);}).catch(cause=>{if(live)setError(financeErrorMessage(cause));}).finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[revision]);
  const selected=items.find(i=>i.id===value);
  const change=useRef(onChange);change.current=onChange;
  useEffect(()=>{if(selected)change.current(selected.id,selected.unit);},[selected?.id,selected?.unit]);
  return <><label className="text-sm">Stock item<select required className={inputClass} aria-busy={loading} value={!loading&&!error&&selected?value:''} onChange={e=>{const item=items.find(i=>i.id===e.target.value);onChange(item?.id??'',item?.unit??'');}}><option value="">{loading?'Loading stock items…':'Select a finished good or raw material'}</option>{items.map(i=><option key={i.id} value={i.id}>{i.name} · {i.unit} · {i.id}</option>)}</select>{error&&<span role="alert" className="block text-red-700">{error}</span>}<button type="button" disabled={loading} className="mt-1 underline" onClick={()=>setRevision(n=>n+1)}>Refresh stock items</button></label><label className="text-sm">Unit (from item)<input required readOnly className={inputClass+' bg-gray-50'} value={selected?.unit??''}/>{selected&&<span className="block text-xs text-gray-500">{selected.id}{selected.lastDate&&` · Last valued movement: ${selected.lastDate}`}</span>}</label>{selected?.valuedUnit&&selected.valuedUnit.trim().toLowerCase()!==selected.unit.trim().toLowerCase()&&<p role="alert" className="text-sm text-red-700">Existing valuation unit {selected.valuedUnit} differs from item unit {selected.unit}. Reconcile the earlier valuation before posting; changing the label cannot convert existing quantities.</p>}</>;
}
