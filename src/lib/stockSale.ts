import type { LEDSnapshot } from './led';
import type { SalesOrderItem } from '@/types';
export function stockSalePricing(customerType: string, items: SalesOrderItem[], taxRate: number | undefined, taxMode: 'inclusive' | 'exclusive'): { items: SalesOrderItem[]; taxRate: number; taxMode: 'inclusive' | 'exclusive' } {
  if (customerType === 'B2B') return { items, taxRate: taxRate ?? 0, taxMode };
  return { items: items.map(({ led: _led, ledSnapshot: _snapshot, ...item }) => item), taxRate: 0, taxMode: 'exclusive' as const };
}
export interface StockSaleSnapshot {
  id: string; orderNumber: string; customerName: string; customerType: string;
  marketingPersonName: string; requisitionOrder: string; currency: string;
  taxRate: number; taxMode: 'inclusive' | 'exclusive'; subtotal: number; discount: number;
  vat: number; led: number; total: number;
  lines: { itemId: string; productId: string; description: string; quantity: number; unit: string; rate: number; amount: number; ledSnapshot?: LEDSnapshot }[];
}
