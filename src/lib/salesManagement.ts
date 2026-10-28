import type { Invoice } from './invoices';
import type { Role, SalesOrder, User } from '@/types';

export const SALES_VIEW_ROLES: Role[] = ['admin', 'accounts', 'receptionist', 'project_manager', 'production_manager', 'qc_inspector', 'qc_supervisor'];
export const SALES_QC_ROLES: Role[] = ['qc_inspector', 'qc_supervisor'];
export const SALES_EDIT_ROLES: Role[] = ['admin', 'accounts', 'receptionist'];
export const SALES_REVIEW_ROLES: Role[] = ['admin', 'accounts'];
export const SALES_LINKS = [
  ['/sales', 'Sales Dashboard'], ['/sales/ledger', 'Sales Ledger'],
  ['/sales/returns', 'Sales Returns'], ['/sales/credit-notes', 'Credit Notes'],
] as const;
export const RETURN_REASONS = ['Damaged Goods', 'Defective Product', 'Incorrect Product', 'Excess Supply', 'Customer Rejection', 'Quality Issue', 'Other'];
export const GOODS_CONDITIONS = ['Uninspected', 'Damaged', 'Defective', 'Unopened', 'Other'];
export const DOCUMENT_STATUSES = ['Draft', 'Submitted', 'Pending Approval', 'Approved', 'Rejected', 'Cancelled'] as const;
export type DocumentStatus = typeof DOCUMENT_STATUSES[number];
export type InvoiceStatus = 'Recorded' | 'Issued' | 'Draft' | 'Cancelled';
export interface SalesLine {
  key: string; productId: string; product: string; quantity: number; unit: string; unitPrice: number;
  net: number; vat: number; led: number; total: number; batch?: string;
}
export interface SalesInvoice {
  id: string; number: string; date: string; customerKey: string; customer: string; linkedCustomer: boolean;
  orderId: string; orderNumber: string; currency: string; status: InvoiceStatus; taxMode: string;
  net: number; vat: number; led: number; total: number; lines: SalesLine[];
  company?: { name:string;address:string;taxId:string;email:string;contact:string };
}
export interface SalesEvent { action: string; userId: string; user: string; at: string; remarks: string }
export interface SalesReturnInspection {
  id:string;result:'Pass'|'Fail'|'Hold';inspectedQuantity:number;remarks:string;inspectorId:string;inspector:string;at:string;
}
export interface SalesReturn {
  id: string; number: string; date: string; invoice: SalesInvoice; line: SalesLine; quantity: number;
  net: number; vat: number; led: number; total: number; reason: string; condition: string; remarks: string;
  attachment?: { name: string; size: number; type: string }; status: DocumentStatus; history: SalesEvent[];
  inspections: SalesReturnInspection[];
}
export interface CreditNote {
  id: string; number: string; date: string; returnId: string; returnNumber: string; invoice: SalesInvoice;
  line: SalesLine; quantity: number; net: number; vat: number; led: number; total: number;
  reason: string; remarks: string; status: DocumentStatus; history: SalesEvent[];
}
export interface SalesWorkspace { returns: SalesReturn[]; credits: CreditNote[]; returnSequence: number; creditSequence: number }
export const emptySalesWorkspace = (): SalesWorkspace => ({ returns: [], credits: [], returnSequence: 0, creditSequence: 0 });
export interface SalesFilters { from: string; to: string; customer: string; product: string; invoiceStatus: string; currency: string; search: string }
export const emptySalesFilters = (): SalesFilters => ({ from: '', to: '', customer: '', product: '', invoiceStatus: '', currency: '', search: '' });
const cents = (n: number) => Math.round(n * 100);
export const salesMoney = (n: number) => cents(n) / 100;
const finite = (n: number) => Number.isFinite(n) && n >= 0 && Math.abs(n) <= 1e12;
export const salesToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
function validDate(date: string) { const parsed=new Date(date+'T00:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === date; }
function allocate(total: number, weights: number[]) {
  const sum = weights.reduce((a,b) => a+b,0);
  if (!sum) { if (total) throw new Error('Invoice amounts cannot be allocated to zero-value lines.'); return weights.map(()=>0); }
  const raw=weights.map(w=>cents(total)*w/sum), result=raw.map(Math.floor);
  const order=raw.map((v,i)=>({i,remainder:v-result[i]})).sort((a,b)=>b.remainder-a.remainder || a.i-b.i);
  for(let remaining=cents(total)-result.reduce((a,b)=>a+b,0),i=0;remaining>0;remaining--,i++) result[order[i%order.length].i]++;
  return result.map(v=>v/100);
}

/** Read-only projection: no inferred payments, batches, invoice approval, or tax rules. */
export function projectSalesInvoices(invoices: Invoice[], orders: SalesOrder[] = []): { invoices: SalesInvoice[]; issues: string[] } {
  const issues: string[] = [], projected: SalesInvoice[] = [], ids=new Set<string>();
  for (const invoice of invoices) {
    try {
      if (!invoice || !invoice.id || ids.has(invoice.id) || !invoice.number || !invoice.buyer || !invoice.currency?.trim() || !validDate(invoice.date) || !Array.isArray(invoice.items) || !invoice.items.length) throw new Error('Incomplete or duplicated invoice identity/date/customer/currency.');
      ids.add(invoice.id);
      if (![invoice.total, invoice.tax, invoice.led ?? 0].every(finite)) throw new Error('Invalid invoice amounts.');
      const net=salesMoney(invoice.total-invoice.tax-(invoice.led??0));
      if (net<0) throw new Error('Invoice tax/LED exceeds its total.');
      if (invoice.items.some(l=>!l.itemId || !l.description || !l.unit || !finite(l.quantity) || l.quantity<=0 || !finite(l.rate) || !finite(l.amount))) throw new Error('Invalid invoice line quantity, unit or price.');
      const weights=invoice.items.map(l=>l.amount), nets=allocate(net,weights), vats=allocate(invoice.tax,weights), leds=allocate(invoice.led??0,weights);
      const order=orders.find(o=>o.id===invoice.orderId);
      // Never merge unrelated buyers solely because their display names happen to match.
      const customerKey=order?.customerId?`customer:${order.customerId}`:`unlinked:${invoice.id}`;
      projected.push({id:invoice.id,number:invoice.number,date:invoice.date,customerKey,customer:invoice.buyer,linkedCustomer:!!order?.customerId,
        orderId:invoice.orderId,orderNumber:invoice.orderNumber,currency:invoice.currency.trim().toUpperCase(),status:'Recorded',taxMode:invoice.taxMode??'exclusive',
        net,vat:salesMoney(invoice.tax),led:salesMoney(invoice.led??0),total:salesMoney(invoice.total),
        company:{name:invoice.seller||'',address:invoice.sellerAddress||'',taxId:invoice.sellerTax||'',email:invoice.email||'',contact:invoice.contact||''},
        lines:invoice.items.map((line,i)=>({key:`${invoice.id}:${i}`,productId:line.itemId,product:line.description,quantity:line.quantity,unit:line.unit,unitPrice:line.rate,net:nets[i],vat:vats[i],led:leds[i],total:salesMoney(nets[i]+vats[i]+leds[i])}))});
    } catch (e) { issues.push(`${invoice?.number||'Unknown invoice'}: ${e instanceof Error?e.message:'Invalid snapshot.'}`); }
  }
  return {invoices:projected,issues};
}

export function returnedQuantity(state: SalesWorkspace, invoiceId: string, lineKey: string, exceptId = '') {
  return state.returns.filter(r=>r.id!==exceptId && r.invoice.id===invoiceId && r.line.key===lineKey && r.status==='Approved').reduce((sum,r)=>sum+r.quantity,0);
}
export function returnAmounts(line: SalesLine, prior: number, quantity: number) {
  if (!finite(quantity) || quantity<=0 || Math.abs(quantity*1e6-Math.round(quantity*1e6))>0.001 || prior+quantity>line.quantity+1e-9) throw new Error('Return quantity must be positive, at most six decimal places, and within the remaining invoiced quantity.');
  const part=(amount:number)=>(Math.round(cents(amount)*(prior+quantity)/line.quantity)-Math.round(cents(amount)*prior/line.quantity))/100;
  const net=part(line.net),vat=part(line.vat),led=part(line.led);
  return {net,vat,led,total:salesMoney(net+vat+led)};
}
function actorEvent(user: User, action: string, remarks=''): SalesEvent { return {action,userId:user.id,user:user.name,at:new Date().toISOString(),remarks}; }
function requireRole(user: User, review=false) { if (!(review?SALES_REVIEW_ROLES:SALES_EDIT_ROLES).includes(user.role)) throw new Error('Your role cannot perform this preview action.'); }
function checkDate(date: string, earliest: string) { if(!validDate(date)||date<earliest||date>salesToday()) throw new Error('Use a valid date on/after the source document and no later than today.'); }
export function previewReference(type: 'return'|'credit', sequence: number) { return `${type==='return'?'SR':'CN'}-PREVIEW-${String(sequence+1).padStart(5,'0')}`; }
export interface ReturnDraft { date: string; invoiceId: string; lineKey: string; quantity: number; reason: string; condition: string; remarks: string; attachment?: SalesReturn['attachment'] }
export function saveSalesReturn(state: SalesWorkspace, invoices: SalesInvoice[], draft: ReturnDraft, user: User, id?: string): SalesWorkspace {
  requireRole(user);
  const existing=id?state.returns.find(r=>r.id===id):undefined;
  if (id && (!existing || existing.status!=='Draft')) throw new Error('Only an existing draft can be edited.');
  const invoice=invoices.find(i=>i.id===draft.invoiceId),line=invoice?.lines.find(l=>l.key===draft.lineKey);
  if (!invoice || !line || ['Cancelled','Draft'].includes(invoice.status)) throw new Error('Select an eligible original invoice and one of its invoiced lines.');
  checkDate(draft.date,invoice.date);
  if (!RETURN_REASONS.includes(draft.reason)||!GOODS_CONDITIONS.includes(draft.condition)||!draft.remarks.trim()) throw new Error('Select a reason, goods condition and enter supporting remarks.');
  const amounts=returnAmounts(line,returnedQuantity(state,invoice.id,line.key,id),draft.quantity);
  const row:SalesReturn={id:id??crypto.randomUUID(),number:existing?.number??previewReference('return',state.returnSequence),date:draft.date,invoice:structuredClone(invoice),line:structuredClone(line),quantity:draft.quantity,...amounts,reason:draft.reason,condition:draft.condition,remarks:draft.remarks.trim(),attachment:draft.attachment,status:'Draft',inspections:[],history:[...(existing?.history??[]),actorEvent(user,existing?'Draft edited':'Draft created')]};
  return {...state,returns:[...state.returns.filter(r=>r.id!==row.id),row],returnSequence:state.returnSequence+(existing?0:1)};
}
const TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = { Draft:['Submitted','Cancelled'],Submitted:['Pending Approval','Rejected','Cancelled'],'Pending Approval':['Approved','Rejected','Cancelled'],Approved:[],Rejected:[],Cancelled:[] };
function checkTransition(status:DocumentStatus,next:DocumentStatus,user:User,remarks:string) {
  requireRole(user,['Pending Approval','Approved','Rejected'].includes(next));
  if (!TRANSITIONS[status].includes(next)) throw new Error('This status transition is unavailable.');
  if (!remarks.trim()) throw new Error('Enter a decision or transition remark.');
}
export function canReviewSalesDocument(document:Pick<SalesReturn,'history'>,user:User) {
  // No existing policy permits self-approval. Admin receives no contributor bypass.
  return SALES_REVIEW_ROLES.includes(user.role) && document.history.some(h=>h.action==='Submitted') &&
    !document.history.some(h=>['Draft created','Draft edited','Submitted'].includes(h.action)&&h.userId===user.id);
}
function independentReview(document:Pick<SalesReturn,'history'>,next:DocumentStatus,user:User) {
  if(['Pending Approval','Approved','Rejected'].includes(next)&&!canReviewSalesDocument(document,user))
    throw new Error('A different authorized reviewer is required. Creators, editors and submitters cannot review their own document, including Admins.');
}
export function transitionSalesReturn(state: SalesWorkspace,id:string,next:DocumentStatus,user:User,remarks:string):SalesWorkspace {
  const row=state.returns.find(r=>r.id===id);if(!row)throw new Error('Return not found.');checkTransition(row.status,next,user,remarks);
  independentReview(row,next,user);
  const amounts=next==='Approved'?returnAmounts(row.line,returnedQuantity(state,row.invoice.id,row.line.key,row.id),row.quantity):{};
  return {...state,returns:state.returns.map(r=>r.id===id?{...r,...amounts,status:next,history:[...r.history,actorEvent(user,next,remarks)]}:r)};
}
export function saveCreditNote(state:SalesWorkspace,returnId:string,date:string,reason:string,remarks:string,user:User,id?:string):SalesWorkspace {
  requireRole(user);
  const existing=id?state.credits.find(c=>c.id===id):undefined;
  if(id&&(!existing||existing.status!=='Draft'))throw new Error('Only a credit-note draft can be edited.');
  const returned=state.returns.find(r=>r.id===returnId);
  if(!returned||returned.status!=='Approved')throw new Error('Select an approved sales return.');
  if(state.credits.some(c=>c.returnId===returnId&&c.id!==id&&!['Cancelled','Rejected'].includes(c.status)))throw new Error('A current credit note already exists for this return.');
  checkDate(date,returned.date);if(!reason.trim()||!remarks.trim())throw new Error('Enter a reason and remarks.');
  const row:CreditNote={id:id??crypto.randomUUID(),number:existing?.number??previewReference('credit',state.creditSequence),date,returnId,returnNumber:returned.number,invoice:structuredClone(returned.invoice),line:structuredClone(returned.line),quantity:returned.quantity,net:returned.net,vat:returned.vat,led:returned.led,total:returned.total,reason:reason.trim(),remarks:remarks.trim(),status:'Draft',history:[...(existing?.history??[]),actorEvent(user,existing?'Draft edited':'Draft created')]};
  return {...state,credits:[...state.credits.filter(c=>c.id!==row.id),row],creditSequence:state.creditSequence+(existing?0:1)};
}
export function transitionCreditNote(state:SalesWorkspace,id:string,next:DocumentStatus,user:User,remarks:string):SalesWorkspace {
  const row=state.credits.find(c=>c.id===id);if(!row)throw new Error('Credit note not found.');checkTransition(row.status,next,user,remarks);
  independentReview(row,next,user);
  if(next==='Approved'&&(!state.returns.some(r=>r.id===row.returnId&&r.status==='Approved')||state.credits.some(c=>c.id!==id&&c.returnId===row.returnId&&c.status==='Approved')))throw new Error('An approved return without another approved credit note is required.');
  return {...state,credits:state.credits.map(c=>c.id===id?{...c,status:next,history:[...c.history,actorEvent(user,next,remarks)]}:c)};
}
export function salesActions(status:DocumentStatus,user:User,document?:Pick<SalesReturn,'history'>) { return TRANSITIONS[status].filter(next=>['Pending Approval','Approved','Rejected'].includes(next)?!!document&&canReviewSalesDocument(document,user):SALES_EDIT_ROLES.includes(user.role)); }
export function recordSalesReturnInspection(state:SalesWorkspace,id:string,result:SalesReturnInspection['result'],inspectedQuantity:number,remarks:string,user:User):SalesWorkspace {
  if(!SALES_QC_ROLES.includes(user.role))throw new Error('A QC Inspector or QC Supervisor profile is required to record a return inspection.');
  const row=state.returns.find(r=>r.id===id);
  if(!row||!['Submitted','Pending Approval','Approved'].includes(row.status))throw new Error('Inspect a submitted, pending or approved return. Draft, rejected and cancelled returns are not eligible.');
  if(!['Pass','Fail','Hold'].includes(result)||!finite(inspectedQuantity)||inspectedQuantity<=0||inspectedQuantity>row.quantity||Math.abs(inspectedQuantity*1e6-Math.round(inspectedQuantity*1e6))>0.001||!remarks.trim())throw new Error('Record a valid inspection result, inspected quantity within the return, and findings.');
  const inspection:SalesReturnInspection={id:crypto.randomUUID(),result,inspectedQuantity,remarks:remarks.trim(),inspectorId:user.id,inspector:user.name,at:new Date().toISOString()};
  return {...state,returns:state.returns.map(r=>r.id===id?{...r,inspections:[...r.inspections,inspection],history:[...r.history,actorEvent(user,`QC ${result}`,remarks)]}:r)};
}
export function salesRestockingReadiness(row:SalesReturn) {
  if(['Draft','Rejected','Cancelled'].includes(row.status))return 'Not eligible for restocking review';
  const latest=row.inspections[row.inspections.length-1];
  if(!latest)return 'Awaiting QC inspection';
  if(latest.result!=='Pass')return 'QC hold — no restocking eligibility';
  if(latest.inspectedQuantity<row.quantity)return 'Partial QC only — remaining returned quantity awaits inspection';
  return 'QC passed — separate restocking authorization required; no stock was moved';
}

export interface SalesLedgerRow {
  key:string;date:string;customerKey:string;customer:string;currency:string;reference:string;invoiceId:string;invoiceNumber:string;type:'Sale'|'Return'|'Credit Note';product:string;productId:string;quantity:number;unit:string;debit:number;credit:number;netDebit:number;netCredit:number;balance:number;status:string;reason:string;note:string;documentId:string;
}
export function salesLedger(invoices:SalesInvoice[],state:SalesWorkspace):SalesLedgerRow[] {
  const rows:SalesLedgerRow[]=[];
  for(const i of invoices) for(const l of i.lines)rows.push({key:`sale:${l.key}`,date:i.date,customerKey:i.customerKey,customer:i.customer,currency:i.currency,reference:i.number,invoiceId:i.id,invoiceNumber:i.number,type:'Sale',product:l.product,productId:l.productId,quantity:l.quantity,unit:l.unit,debit:['Draft','Cancelled'].includes(i.status)?0:l.total,credit:0,netDebit:['Draft','Cancelled'].includes(i.status)?0:l.net,netCredit:0,balance:0,status:i.status,reason:'',note:'Invoice snapshot; payment and issuance status are not inferred.',documentId:i.id});
  for(const r of state.returns){
    // The approved return recognizes the adjustment once. Its credit note documents the same adjustment.
    rows.push({key:`return:${r.id}`,date:r.date,customerKey:r.invoice.customerKey,customer:r.invoice.customer,currency:r.invoice.currency,reference:r.number,invoiceId:r.invoice.id,invoiceNumber:r.invoice.number,type:'Return',product:r.line.product,productId:r.line.productId,quantity:r.quantity,unit:r.line.unit,debit:0,credit:r.status==='Approved'?r.total:0,netDebit:0,netCredit:r.status==='Approved'?r.net:0,balance:0,status:r.status,reason:r.reason,note:r.status==='Approved'?'Approved preview return adjustment; a linked credit note adds no second credit.':'Unapproved return; no financial effect.',documentId:r.id});
  }
  for(const c of state.credits)rows.push({key:`credit:${c.id}`,date:c.date,customerKey:c.invoice.customerKey,customer:c.invoice.customer,currency:c.invoice.currency,reference:c.number,invoiceId:c.invoice.id,invoiceNumber:c.invoice.number,type:'Credit Note',product:c.line.product,productId:c.line.productId,quantity:c.quantity,unit:c.line.unit,debit:0,credit:0,netDebit:0,netCredit:0,balance:0,status:c.status,reason:c.reason,note:`Documents ${c.returnNumber}; adjustment recognized on return, no duplicate deduction.`,documentId:c.id});
  const rank={Sale:0,Return:1,'Credit Note':2},balances=new Map<string,number>();
  return rows.sort((a,b)=>a.date.localeCompare(b.date)||rank[a.type]-rank[b.type]||a.reference.localeCompare(b.reference)||a.key.localeCompare(b.key)).map(r=>{const key=`${r.customerKey}|${r.currency}`,balance=salesMoney((balances.get(key)??0)+r.debit-r.credit);balances.set(key,balance);return {...r,balance};});
}
export function filterSalesLedger(rows:SalesLedgerRow[],invoices:SalesInvoice[],f:SalesFilters) {
  const statuses=new Map(invoices.map(i=>[i.id,i.status]));
  return rows.filter(r=>(!f.from||r.date>=f.from)&&(!f.to||r.date<=f.to)&&(!f.customer||r.customerKey===f.customer)&&(!f.product||r.productId===f.product)&&(!f.currency||r.currency===f.currency)&&(!f.invoiceStatus||statuses.get(r.invoiceId)===f.invoiceStatus)&&(!f.search||[r.reference,r.customer,r.product,r.type,r.invoiceNumber,r.reason].some(v=>v.toLowerCase().includes(f.search.toLowerCase()))));
}
export function salesSummary(rows:SalesLedgerRow[],state:SalesWorkspace) {
  const sum=(key:'debit'|'credit'|'netDebit'|'netCredit')=>salesMoney(rows.reduce((n,r)=>n+r[key],0));
  const approvedReturns=rows.filter(r=>r.type==='Return'&&r.status==='Approved');
  const quantities:Record<string,number>={};for(const r of approvedReturns)quantities[r.unit]=(quantities[r.unit]??0)+r.quantity;
  const gross=sum('debit'),adjustment=sum('credit');
  return {gross,adjustment,net:salesMoney(gross-adjustment),taxExclusiveSales:sum('netDebit'),taxExclusiveAdjustments:sum('netCredit'),taxExclusiveNet:salesMoney(sum('netDebit')-sum('netCredit')),invoices:new Set(rows.filter(r=>r.type==='Sale'&&!['Draft','Cancelled'].includes(r.status)).map(r=>r.documentId)).size,customers:new Set(rows.filter(r=>r.type==='Sale').map(r=>r.customerKey)).size,returns:rows.filter(r=>r.type==='Return').length,credits:rows.filter(r=>r.type==='Credit Note'&&r.status==='Approved').length,creditValue:salesMoney(rows.filter(r=>r.type==='Credit Note'&&r.status==='Approved').reduce((n,r)=>n+(state.credits.find(c=>c.id===r.documentId)?.total??0),0)),quantities};
}
export function salesCsv(rows:SalesLedgerRow[]) {
  const fields=[['Date','Customer','Reference','Original invoice','Type','Product','Return / Credit Reason','Quantity','Unit','Currency','Debit (tax inclusive)','Credit (tax inclusive)','Customer sales balance (not receivables)','Status','Notes'],...rows.map(r=>[r.date,r.customer,r.reference,r.invoiceNumber,r.type,r.product,r.reason,r.quantity,r.unit,r.currency,r.debit,r.credit,r.balance,r.status,r.note])];
  return '\ufeff'+fields.map(row=>row.map(v=>`"${String(v).replace(/^[\s]*[=+@-]/,"'$&").replace(/"/g,'""')}"`).join(',')).join('\r\n');
}
