import { useState } from 'react';
import { ENTRY_INPUT } from '@/components/ui/SearchSelect';
import { salesRestockingReadiness, type SalesReturn, type SalesReturnInspection } from '@/lib/salesManagement';
const button='rounded-card border border-gray-200 bg-white px-4 py-2 text-sm disabled:opacity-50';
export function SalesReturnInspectionPanel({row,canRecord,onRecord}:{row:SalesReturn;canRecord:boolean;onRecord:(result:SalesReturnInspection['result'],quantity:number,remarks:string)=>void}) {
  const [result,setResult]=useState<SalesReturnInspection['result']>('Hold'),[quantity,setQuantity]=useState(String(row.quantity)),[remarks,setRemarks]=useState(''),[error,setError]=useState('');
  const eligible=['Submitted','Pending Approval','Approved'].includes(row.status);
  return <section className="space-y-3 rounded border p-3 text-sm"><h3 className="font-semibold">Returned goods QC inspection</h3><p>{salesRestockingReadiness(row)}</p><p>Inspection results do not approve credit notes or post Finished Goods stock. Passing QC still requires a separate authorized restocking decision.</p>
    {row.inspections.length>0?<ol className="space-y-2">{row.inspections.map(i=><li key={i.id}>{i.at} · {i.result} · {i.inspectedQuantity} {row.line.unit} · {i.inspector} ({i.inspectorId})<br/>{i.remarks}</li>)}</ol>:<p>No inspection recorded.</p>}
    {canRecord&&eligible&&<form className="print:hidden space-y-3" onSubmit={e=>{e.preventDefault();try{onRecord(result,Number(quantity),remarks);setRemarks('');setError('');}catch(cause){setError(cause instanceof Error?cause.message:'Inspection preview could not be recorded.');}}}>
      <div className="grid gap-3 sm:grid-cols-2"><label>Inspection result<select required className={ENTRY_INPUT} value={result} onChange={e=>setResult(e.target.value as SalesReturnInspection['result'])}><option>Hold</option><option>Pass</option><option>Fail</option></select></label><label>Inspected quantity ({row.line.unit})<input className={ENTRY_INPUT} required type="number" min="0.000001" max={row.quantity} step="0.000001" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label></div>
      <label className="block">Inspection findings *<textarea required maxLength={5000} className={ENTRY_INPUT} value={remarks} onChange={e=>setRemarks(e.target.value)}/></label>{error&&<p role="alert" className="text-red-700">{error}</p>}<button className={button}>Record QC inspection preview</button>
    </form>}
  </section>;
}
