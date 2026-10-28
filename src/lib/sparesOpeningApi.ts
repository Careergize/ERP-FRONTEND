import { api } from './api';
import { registerApi, type Capabilities, type Page, type RegisterItem } from './registerApi';
export type SpareItem = RegisterItem & { opening_state?: { status: 'UNKNOWN'|'PENDING'|'INITIALIZED'|'UNAVAILABLE'; request_id: string|null } };
export type SpareCapabilities = Capabilities & {
  spares_opening_version?: number; schema_ready?: boolean; opening_schema_ready?: boolean; diagnostic_code?: string;
  can_request_opening?: boolean; can_review_opening?: boolean; can_view_openings?: boolean;
};
export interface SpareOpening {
  id: string; submission_id: string; item: string; item_code: string; item_name: string; category: string;
  quantity: string; unit: string; date: string; department: string; reference: string; remarks: string;
  requested_by: number; requested_by_name: string; requested_at: string; payload_digest: string;
  status: 'PENDING'|'APPROVED'|'REJECTED'; can_review: boolean;
  decision: null|{id: string; command_id: string; reviewer: number; outcome: string; remarks: string; decided_at: string; movement: string|null; transaction_reference: string|null};
}
export function invalidSpareResponse() {
  return Object.assign(new Error('Invalid Spares API response'),{response:{status:502,data:{code:'spares_invalid_response'}}});
}
function validPage(value:unknown):value is Page<unknown> {
  const page=value as Page<unknown>|null;
  return Boolean(page && typeof page==='object' && Number.isInteger(page.count) && page.count>=0 && Array.isArray(page.results));
}
function validOpening(value:unknown):value is SpareOpening {
  const row=value as SpareOpening|null;
  return Boolean(row && typeof row==='object' && typeof row.id==='string' && typeof row.item==='string' && typeof row.submission_id==='string' && typeof row.quantity==='string' && typeof row.unit==='string' && typeof row.date==='string' && typeof row.can_review==='boolean' && /^[0-9a-f]{64}$/.test(row.payload_digest) && ['PENDING','APPROVED','REJECTED'].includes(row.status) && (row.status==='PENDING'?row.decision===null:row.decision && row.decision.outcome===row.status && (row.status==='APPROVED'?typeof row.decision.movement==='string' && typeof row.decision.transaction_reference==='string':row.decision.movement===null)));
}
export const spareOpeningApi = {
  async list(status='',page=1) { const data=(await api.get<Page<SpareOpening>>('/spares/opening-requests/',{params:{status,page},timeout:15000})).data;if(!validPage(data)||!data.results.every(validOpening))throw invalidSpareResponse();return data; },
  async request(item:string,body:Record<string,unknown>) { const data=(await api.post<SpareOpening>(`/spares/${item}/opening-requests/`,body,{timeout:15000})).data;if(!validOpening(data)||data.item!==item||data.submission_id!==body.submission_id)throw invalidSpareResponse();return data; },
  async review(id:string,body:Record<string,unknown>) { const data=(await api.post<SpareOpening>(`/spares/opening-requests/${id}/review/`,body,{timeout:15000})).data;if(!validOpening(data)||data.id!==id||data.status!==body.outcome||data.decision?.command_id!==body.command_id)throw invalidSpareResponse();return data; },
};
export function initializedSpares(items:SpareItem[],type:'IN'|'OUT') {
  return items.filter(i=>i.is_active && i.stock?.opening_stock!=null && i.stock.current_stock!=null && (type==='IN'||Number(i.stock.current_stock)>0));
}
export function sparePostingAvailable(caps:SpareCapabilities|null,items:SpareItem[],type:'IN'|'OUT') {
  return Boolean(caps?.can_post && caps.spares_opening_version===1 && caps.schema_ready && initializedSpares(items,type).length);
}
export function spareFailure(error:unknown) {
  const e=error as {response?:{status:number;data?:unknown};message?:string};
  const body=e?.response?.data as {code?:string;detail?:string}|undefined;
  const status=e?.response?.status;
  if(!status)return {kind:'network',message:'The Spares API could not be reached. This is not an empty-register result. Retry using the same request ID.',uncertain:true};
  if(body?.code==='spares_invalid_response')return {kind:'api',message:'The Spares API returned an unexpected response. Verify the intended API URL and backend version; no success is confirmed.',uncertain:true};
  if(status===401)return {kind:'authentication',message:'Your session is not authenticated. Sign in again.',uncertain:false};
  if(body?.code==='spares_migrations_required')return {kind:'schema',message:'This API is missing required Spares catalogue or opening-approval migrations. An approved administrator must verify the migration plan; no migration is run from this page.',uncertain:false};
  if(status===403)return {kind:'permission',message:typeof body?.detail==='string'?body.detail:'Your account lacks the required Spares permission. Role titles do not authorize openings.',uncertain:false};
  if(status===409)return {kind:'conflict',message:typeof body?.detail==='string'?body.detail:'This request is already pending/decided or its identifier was reused. Reload before starting another request.',uncertain:false};
  if(status===400)return {kind:'validation',message:e.response?.data && typeof e.response.data==='object'?JSON.stringify(e.response.data):'The server rejected the Spares entry. Check its quantity, unit and opening state.',uncertain:false};
  if(status===404)return {kind:'api',message:'The Spares endpoint or record is unavailable. Verify the intended API URL and backend version.',uncertain:false};
  return {kind:'api',message:'The Spares API could not confirm this operation. Retry with the same request ID; do not treat this as an empty register or a successful posting.',uncertain:true};
}

export async function loadSparesRegister(filters:Record<string,string>,page:number) {
  const [listing,capabilities]=await Promise.allSettled([registerApi.list('spares',filters,page).then(data=>{if(!validPage(data)||!data.results.every(i=>i && typeof i.id==='string' && typeof i.code==='string' && typeof i.unit==='string' && typeof i.is_active==='boolean'))throw invalidSpareResponse();return data;}),registerApi.capabilities('spares').then(data=>{if(!data || typeof data!=='object'||!['can_post','can_create','can_edit'].every(key=>typeof data[key as keyof Capabilities]==='boolean'))throw invalidSpareResponse();return data;})]);
  const errors:string[]=[];
  if(listing.status==='rejected')errors.push(`Register request: ${spareFailure(listing.reason).message}`);
  if(capabilities.status==='rejected')errors.push(`Capabilities request: ${spareFailure(capabilities.reason).message}`);
  return {data:listing.status==='fulfilled'?listing.value:{count:0,next:null,previous:null,results:[]},listLoaded:listing.status==='fulfilled',caps:capabilities.status==='fulfilled'?capabilities.value as SpareCapabilities:null,error:errors.join(' ')};
}
