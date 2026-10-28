import { api } from './api';
import { registerApi, type RegisterItem, type RegisterKind, type Page } from './registerApi';
export interface CatalogueItem extends RegisterItem {
  subcategory?: string; department?: string; supplier?: string; storage_location?: string;
  expense_classification?: string; minimum_stock?: string; reorder_quantity?: string; unit_cost?: string | null;
  machine?: string; last_purchase_date?: string | null; created_by?: number; updated_by?: number | null;
  created_at?: string; updated_at?: string; creation_request_id?: string;
}
export interface CatalogueMovement {
  transaction_reference?: string; id: string; item: string; item_code: string; item_name: string; request_id: string;
  movement_type: 'IN' | 'OUT'; is_opening: boolean; quantity: string; unit: string;
  reference: string; date: string; department: string; supplier: string; unit_cost: string | null;
  storage_location: string; received_issued_by: string; issued_to: string; purpose: string;
  machine: string; job_reference: string; purchase_order_reference: string; invoice_reference: string;
  remarks: string; recorded_by: number; created_at: string;
}
export interface CatalogueSummary {
  total_items: number; stock_value: string; unknown_stock: number; unvalued_items: number;
  low_stock: number; out_of_stock: number; office_items: number; factory_items: number;
}
export interface CatalogueActivity {
  id: number; version: number; actor: string; actor_id: number; at: string;
  content: { item_id: string; item_code: string; action: string; previous: unknown; next: unknown; reference: string; department: string; remarks: string };
}
export const catalogueApi = {
  async list(kind: RegisterKind, params: Record<string,string>, page=1) { return await registerApi.list(kind,params,page) as Page<CatalogueItem>; },
  async save(kind: RegisterKind, id: string | undefined, data: Record<string,unknown>) { return (await (id ? api.patch<CatalogueItem>(`/${kind}/${id}/`,data) : api.post<CatalogueItem>(`/${kind}/`,data))).data; },
  async summary(kind: RegisterKind, params: Record<string,string>) { return (await api.get<CatalogueSummary>(`/${kind}/summary/`,{params})).data; },
  async history(kind: RegisterKind, params: Record<string,string>, page=1) { return (await api.get<Page<CatalogueMovement>>(`/${kind}/history/`,{params:{...params,page}})).data; },
  async activity(kind: RegisterKind, params: Record<string,string>, page=1) { return (await api.get<Page<CatalogueActivity>>(`/${kind}/activity/`,{params:{...params,page}})).data; },
  async post(kind: RegisterKind, item: string, data: Record<string,unknown>) { return (await api.post<CatalogueMovement>(`/${kind}/${item}/movements/`,data)).data; },
};
