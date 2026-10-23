import { api } from './api';

export type DraftNumber = string | number;
export interface DraftItem extends Record<string, unknown> {
  id: string; itemName: string; fulfillmentSource: 'stock' | 'manufacturing';
  quantity: DraftNumber; unit: string; unitPrice: DraftNumber;
  itemId?: string; modelId?: string; modelRevision?: number; requiredDate?: string;
}
export interface DraftContent extends Record<string, unknown> {
  customerName: string; date: string; marketingPersonName: string; customerType: 'B2B' | 'B2C' | '';
  currency: string; taxRate: DraftNumber; items: DraftItem[];
}
export interface DraftRecord extends DraftContent {
  id: string; orderNumber: string; status: string; jobCardIds: string[];
  controlVersion: number | null; commercialStatus: string | null;
  currentRevision: number | null; confirmedRevision: number | null; orderTotal: number;
}
export interface DraftCommand {
  commandId: string; expectedVersion: number; reason: string; evidenceIds: []; content: DraftContent;
}
export interface DraftHistory {
  orderId: number;
  revisions: { id: number; revision: number; content: DraftContent; contentHash: string; capturedAt: string; reason: string }[];
}
export class DraftRequestError extends Error {
  constructor(message: string, public status?: number, public code?: string, public fields: unknown = {}) { super(message); }
}
export function draftTestEnabled(flag: unknown, baseURL: unknown): boolean {
  try { return flag === 'true' && typeof baseURL === 'string' && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname); }
  catch { return false; }
}
export const CONTROLLED_DRAFT_TEST_ENABLED = draftTestEnabled(import.meta.env.VITE_ENABLE_CONTROLLED_ORDER_DRAFTS, api.defaults.baseURL);
export function orderPK(id: string): number {
  if (!/^(wf-order-)?[1-9]\d*$/.test(id)) throw new DraftRequestError('Enter a saved WorkflowOrder ID.', 400, 'VALIDATION_ERROR');
  const pk = Number(id.replace('wf-order-', ''));
  if (!Number.isSafeInteger(pk)) throw new DraftRequestError('Order ID exceeds the supported browser range.', 400, 'VALIDATION_ERROR');
  return pk;
}
export function isControlledDraft(order: DraftRecord): boolean {
  return Number.isSafeInteger(order.controlVersion) && order.controlVersion! > 0;
}
export function editableDraft(order: DraftRecord): boolean {
  return isControlledDraft(order) && order.commercialStatus === 'Draft' && order.status === 'Draft' &&
    order.confirmedRevision === null && order.jobCardIds.length === 0;
}
// Explicit root projection: retain supported source/commercial metadata, never send response control fields.
const CONTENT_KEYS = ['customerName', 'customerId', 'date', 'marketingPersonName', 'customerType', 'currency',
  'requisitionOrder', 'quotationId', 'quotationRevisionId', 'quotationNumber', 'prospectId', 'taxRate',
  'quotationRevision', 'commercialPricing', 'customerContact', 'commercialTerms', 'items'];
export function draftContent(order: DraftRecord): DraftContent {
  return structuredClone(Object.fromEntries(CONTENT_KEYS.filter(key => key in order).map(key => [key, order[key]]))) as DraftContent;
}
export function validateDraft(content: DraftContent, reason: string): void {
  const numeric = (value: unknown, positive = false) => (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') &&
    Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 99999999999 && (!positive || Number(value) > 0);
  if (!content.customerName.trim() || !content.marketingPersonName.trim() || !content.currency.trim() ||
      !['B2B', 'B2C'].includes(content.customerType) || !/^\d{4}-\d{2}-\d{2}$/.test(content.date) ||
      !Number.isFinite(Date.parse(content.date)) || !numeric(content.taxRate) || Number(content.taxRate) > 100 ||
      !reason.trim() || reason.length > 2000 || !content.items.length || content.items.length > 100 ||
      new Set(content.items.map(item => item.id)).size !== content.items.length) {
    throw new DraftRequestError('Complete the customer, date, currency, tax, reason and distinct product lines.', 400, 'VALIDATION_ERROR');
  }
  for (const item of content.items) {
    if (!item.id || !item.itemName.trim() || !item.unit.trim() || !numeric(item.quantity, true) || !numeric(item.unitPrice) ||
        !['stock', 'manufacturing'].includes(item.fulfillmentSource) || 'jobRouting' in item ||
        (item.fulfillmentSource === 'stock' && !item.itemId) ||
        (item.fulfillmentSource === 'manufacturing' && (!item.modelId || !Number.isSafeInteger(item.modelRevision) ||
          item.modelRevision! <= 0 || !item.requiredDate || item.requiredDate < content.date))) {
      throw new DraftRequestError('Check each product, saved source, exact unit, quantity, price and manufacturing date/revision. Custom Job Card routing is not a Draft field.', 400, 'VALIDATION_ERROR');
    }
  }
}
async function request<T>(path: string, command?: DraftCommand): Promise<T> {
  try {
    return (command ? await api.post<T>(`/production-workflow/order-drafts/${path}`, command, { timeout: 20000 }) :
      await api.get<T>(`/production-workflow/order-drafts/${path}`, { timeout: 15000 })).data;
  } catch (cause) {
    const response = (cause as { response?: { status: number; data?: { detail?: unknown; code?: string; fields?: unknown } } }).response;
    const detail = response?.data?.detail;
    const code = response?.data?.code;
    const message = code === 'VERSION_CONFLICT' ? 'This Draft changed. Your edits are kept. Reload the saved Draft before editing again.' :
      response?.status === 401 ? 'Authentication failed. Sign in again; the save has not been confirmed.' :
      response?.status === 403 ? 'Your account is not authorised for this Draft request.' :
      typeof detail === 'string' ? detail : response ? 'The backend rejected this Draft request.' :
      'No save confirmation was received. Retry the exact pending command before changing this Draft.';
    throw new DraftRequestError(message, response?.status, code, response?.data?.fields);
  }
}
function record(value: DraftRecord): DraftRecord {
  if (!value || typeof value.id !== 'string' || !/^wf-order-[1-9]\d*$/.test(value.id) || !Number.isSafeInteger(Number(value.id.replace('wf-order-', ''))) || typeof value.orderNumber !== 'string' || !Array.isArray(value.items) ||
      !Array.isArray(value.jobCardIds) || !(value.controlVersion === null || Number.isSafeInteger(value.controlVersion)) ||
      !value.items.every(item => item && typeof item.id === 'string' && typeof item.unit === 'string')) {
    throw new DraftRequestError('Invalid Draft response. Save outcome is uncertain; retry the same command.');
  }
  return value;
}
export const orderDraftApi = {
  read: async (pk: number) => {
    const result = record(await request<DraftRecord>(`${pk}/`));
    if (orderPK(result.id) !== pk) throw new DraftRequestError('The backend returned a different Draft. Reload before continuing.');
    return result;
  },
  save: async (pk: number | null, command: DraftCommand) => {
    const result = record(await request<DraftRecord>(pk === null ? '' : `${pk}/`, command));
    if (!editableDraft(result) || result.controlVersion !== command.expectedVersion + 1 || pk !== null && orderPK(result.id) !== pk) {
      throw new DraftRequestError('Unexpected save response. Retry the same pending command to resolve the outcome.');
    }
    return result;
  },
  history: async (pk: number) => {
    const result = await request<DraftHistory>(`${pk}/history/`);
    if (result?.orderId !== pk || !Array.isArray(result.revisions)) throw new DraftRequestError('Invalid revision history response.');
    return result;
  },
};
