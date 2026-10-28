import { api } from './api';
export const REGISTER_UNITS = ['Each', 'Both', 'Litres', 'Kilos'] as const;
export type RegisterKind = 'spares' | 'consumables';
export interface RegisterItem {
  id: string; code: string; name: string; description: string; unit: string; is_active: boolean;
  supplier?: string; department?: string; storage_location?: string; expense_classification?: string; unit_cost?: string | null; creation_request_id?: string;
  category?: string; minimum_stock?: string;
  stock?: { opening_stock: string | null; stock_in: string; stock_out: string; current_stock: string | null; below_minimum: boolean };
}
export type ItemInput = Omit<RegisterItem, 'id' | 'stock'>;
export interface Capabilities { can_create: boolean; can_edit: boolean; can_post: boolean; posting_notice: string; can_view_movements?: boolean; can_open?: boolean; catalogue_version?: number }
export interface Page<T> { count: number; next: string | null; previous: string | null; results: T[] }
export interface SpareMovement { transaction_reference?: string | null; id: string; item: string; movement_type: 'IN' | 'OUT'; is_opening: boolean; quantity: string; unit: string; reference: string; recorded_by: number; created_at: string }
export const registerApi = {
  async list(kind: RegisterKind, params: Record<string, string>, page = 1) {
    return (await api.get<Page<RegisterItem>>(`/${kind}/`, { params: { ...params, page }, timeout: 15000 })).data;
  },
  async capabilities(kind: RegisterKind) { return (await api.get<Capabilities>(`/${kind}/capabilities/`, { timeout: 15000 })).data; },
  async save(kind: RegisterKind, id: string | undefined, data: ItemInput) {
    const path = `/${kind}/${id ? `${id}/` : ''}`;
    return (await (id ? api.patch<RegisterItem>(path, data) : api.post<RegisterItem>(path, data))).data;
  },
  async movements(id: string, page = 1) { return (await api.get<Page<SpareMovement>>(`/spares/${id}/movements/`, { params: { page }, timeout: 15000 })).data; },
};
export function registerError(error: unknown): string {
  const e = error as { response?: { status?: number; data?: unknown }; message?: string };
  if (e.response?.status === 403) return 'Your account is not authorized for this action.';
  if (e.response?.status && e.response.status >= 500) return 'The server could not complete this request. Retry with the same request reference.';
  if (e.response?.data && typeof e.response.data === 'object') return JSON.stringify(e.response.data);
  if (e.response?.status === 401) return 'Please sign in again.';
  return e.message || 'Unable to reach the backend. Please retry.';
}
