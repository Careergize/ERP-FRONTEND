import { api } from './api';
export const REGISTER_UNITS = ['Each', 'Both', 'Litres', 'Kilos'] as const;
export type RegisterKind = 'spares' | 'consumables';
export interface RegisterItem {
  id: string; code: string; name: string; description: string; unit: string; is_active: boolean;
  category?: 'IMPORTED' | 'LOCAL'; minimum_stock?: string;
  stock?: { opening_stock: string | null; stock_in: string; stock_out: string; current_stock: string | null; below_minimum: boolean };
}
export type ItemInput = Omit<RegisterItem, 'id' | 'stock'>;
export interface Capabilities { can_create: boolean; can_edit: boolean; can_post: boolean; posting_notice: string }
export interface Page<T> { count: number; next: string | null; previous: string | null; results: T[] }
export interface SpareMovement { id: string; item: string; movement_type: 'IN' | 'OUT'; is_opening: boolean; quantity: string; unit: string; reference: string; recorded_by: number; created_at: string }
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
  if (e.response?.data) return JSON.stringify(e.response.data);
  return e.message || 'Unable to reach the backend. Please retry.';
}
