import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useSalesOrders } from './SalesOrdersContext';
import { loadSharedEntries } from '@/lib/sharedEntryStore';
import type { Invoice } from '@/lib/invoices';
import { emptySalesWorkspace, projectSalesInvoices, saveSalesReturn, saveCreditNote, transitionSalesReturn, transitionCreditNote, recordSalesReturnInspection, type SalesReturnInspection, type SalesInvoice, type SalesWorkspace, type ReturnDraft, type DocumentStatus } from '@/lib/salesManagement';

// Explicit example data, never a fallback for unavailable business records.
export const DEMO_SALES_INVOICES: SalesInvoice[] = [
  {id:'example-invoice-1',number:'EXAMPLE-INV-001',date:'2026-09-10',customerKey:'example-customer-a',customer:'Example Customer A',linkedCustomer:true,orderId:'example-order-1',orderNumber:'EXAMPLE-SO-001',currency:'USD',status:'Issued',taxMode:'exclusive',net:1000,vat:180,led:0,total:1180,lines:[{key:'example-invoice-1:0',productId:'example-product-1',product:'Example packaging cartons',quantity:100,unit:'CTR',unitPrice:10,net:1000,vat:180,led:0,total:1180,batch:'EXAMPLE-BATCH-01'}]},
  {id:'example-invoice-2',number:'EXAMPLE-INV-002',date:'2026-10-01',customerKey:'example-customer-b',customer:'Example Customer B',linkedCustomer:true,orderId:'example-order-2',orderNumber:'EXAMPLE-SO-002',currency:'USD',status:'Issued',taxMode:'inclusive',net:200,vat:36,led:0,total:236,lines:[{key:'example-invoice-2:0',productId:'example-product-2',product:'Example film',quantity:20,unit:'KG',unitPrice:11.8,net:200,vat:36,led:0,total:236}]},
];
// Explicit examples only: preserve a handoff between authenticated demo profiles in this tab.
// Real invoice previews remain account-scoped and are never placed in this shared example state.
let exampleSession=emptySalesWorkspace();
for(const invoice of DEMO_SALES_INVOICES)invoice.company={name:'Example Navapack Company',address:'Example company address — demonstration only',taxId:'EXAMPLE-TAX-ID',email:'example@example.invalid',contact:'Example contact'};
interface Value {
  source:'saved'|'demo';setSource:(v:'saved'|'demo')=>void;invoices:SalesInvoice[];state:SalesWorkspace;
  loading:boolean;error:string;notice:string;issues:string[];refresh:()=>void;
  saveReturn:(draft:ReturnDraft,id?:string)=>void;saveCredit:(returnId:string,date:string,reason:string,remarks:string,id?:string)=>void;
  transitionReturn:(id:string,status:DocumentStatus,remarks:string)=>void;transitionCredit:(id:string,status:DocumentStatus,remarks:string)=>void;
  inspectReturn:(id:string,result:SalesReturnInspection['result'],quantity:number,remarks:string)=>void;
}
const Context=createContext<Value|null>(null);
export function SalesManagementProvider({children}:{children:ReactNode}) {
  const {user}=useAuth();const {orders}=useSalesOrders();
  const [source,setSource]=useState<'saved'|'demo'>('saved'),[saved,setSaved]=useState<Invoice[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  const [notice,setNotice]=useState('');
  const [workspaces,setWorkspaces]=useState(()=>({saved:emptySalesWorkspace(),demo:exampleSession}));
  const current=useRef(workspaces);current.current=workspaces;
  useEffect(()=>{
    let live=true;
    if(!user||user.id.startsWith('demo-')){setSaved([]);setLoading(false);setError('Saved invoice records require an authenticated backend account. Choose the explicit example workspace to try the frontend.');return;}
    setLoading(true);setError('');
    void loadSharedEntries().then(store=>{
      if(!live){store.dispose();return;}
      if(!store.readable.has('invoices')){store.dispose();throw new Error('Your account does not have read access to the existing invoice register.');}
      const rows=store.get<Invoice[]>('invoices',[]);store.dispose();if(!Array.isArray(rows))throw new Error('The existing invoice register returned an invalid record set.');setSaved(structuredClone(rows));
    }).catch(e=>{if(live){setSaved([]);const status=(e as {response?:{status?:number}})?.response?.status;setError(status===401?'Your backend session is not authenticated.':status===403?'Your account cannot read invoice records.':e instanceof Error?e.message:'Invoice records could not be loaded. This is not an empty sales register.');}}).finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[user?.id,revision]);
  const projection=projectSalesInvoices(saved,orders),invoices=source==='demo'?DEMO_SALES_INVOICES:projection.invoices;
  const change=(update:(state:SalesWorkspace)=>SalesWorkspace,message:string)=>{
    if(!user)throw new Error('Sign in to use the preview workspace.');
    if(source==='saved'&&(loading||error))throw new Error('Load the invoice register before preparing adjustments.');
    const next={...current.current,[source]:update(current.current[source])};if(source==='demo')exampleSession=next.demo;current.current=next;setWorkspaces(next);setNotice(message+' This is a session-only preview; nothing was saved to the server.');
  };
  return <Context.Provider value={{source,setSource:v=>{setSource(v);setNotice('');},invoices,state:workspaces[source],loading:source==='saved'&&loading,error:source==='saved'?error:'',notice,issues:source==='saved'?projection.issues:[],refresh:()=>setRevision(v=>v+1),
    saveReturn:(draft,id)=>change(s=>saveSalesReturn(s,invoices,draft,user!,id),'Return draft prepared.'),
    saveCredit:(returnId,date,reason,remarks,id)=>change(s=>saveCreditNote(s,returnId,date,reason,remarks,user!,id),'Credit-note draft prepared.'),
    transitionReturn:(id,status,remarks)=>change(s=>transitionSalesReturn(s,id,status,user!,remarks),`Return marked ${status}.`),
    transitionCredit:(id,status,remarks)=>change(s=>transitionCreditNote(s,id,status,user!,remarks),`Credit note marked ${status}.`),
    inspectReturn:(id,result,quantity,remarks)=>change(s=>recordSalesReturnInspection(s,id,result,quantity,remarks,user!),'QC inspection recorded; no stock was moved.'),
  }}>{children}</Context.Provider>;
}
export function useSalesManagement(){const value=useContext(Context);if(!value)throw new Error('SalesManagementProvider required');return value;}
