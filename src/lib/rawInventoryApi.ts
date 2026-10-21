import { api } from './api';
import type { RawMaterial, RawMaterialMovement } from './rawMaterialData';
import type { ProcurementItem } from './procurement';

export interface RawInventorySnapshot { materials: RawMaterial[]; movements: RawMaterialMovement[]; plans: ProcurementItem[]; canPost: boolean; canPlan: boolean }
export async function fetchRawInventory() {
  return (await api.get<RawInventorySnapshot>('/raw-inventory/', {timeout:15000})).data;
}
export async function postRawMovement(movement: RawMaterialMovement) {
  return (await api.post<RawMaterialMovement>('/raw-inventory/movements/', movement, {timeout:15000})).data;
}
export async function persistRawPlan(plan: ProcurementItem) {
  return (await api.put<ProcurementItem>(`/procurement-plans/${encodeURIComponent(plan.materialId!)}/`, {
    stock:plan.stock,asOfDate:plan.asOfDate,monthly:plan.monthly, days:plan.days, lead:plan.lead, comment:plan.comment, deliveries:plan.deliveries, expected_version:plan.version??0,
  }, {timeout:15000})).data;
}
export async function fetchProcurement(){
  return (await api.get<{materials:RawMaterial[];plans:ProcurementItem[];canPlan:boolean}>('/procurement-plans/',{timeout:15000})).data;
}
export function inventoryError(error: unknown) {
  const data=(error as {response?:{data?:unknown}})?.response?.data;
  if (data && typeof data==='object') {
    if ('detail' in data) return String(data.detail);
    return Object.values(data).flat().map(String).join(' ');
  }
  return 'Unable to reach the inventory server. Check your connection and reload before retrying.';
}
