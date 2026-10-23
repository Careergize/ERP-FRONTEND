import { api } from './api';
import { draftTestEnabled, DraftRequestError } from './orderDraftApi';
export const JOB_DRAFT_TEST_ENABLED = draftTestEnabled(import.meta.env.VITE_ENABLE_CONTROLLED_JOB_DRAFTS, api.defaults.baseURL);
export interface JobDraftCommand {
  commandId: string; expectedVersion: number; reason: string; evidenceIds: [];
  orderId: number; expectedOrderVersion: number; sourceConfirmedRevision: number;
  corrections: Record<string, { specifications?: string; productionRequirements?: string }>;
}
export interface JobDraftRecord {
  workflowKey: number; workflowVersion: number | null; jobCardNumber?: string; salesOrderId: string;
  sourceConfirmedRevision: number | null; reviewStatus: string; operationalBlockCodes: string[];
  capabilities: { edit: boolean; approve: false; reject: false; issue: false };
  sourceOrderSnapshot?: unknown;
  manufacturingItems?: { id: string; salesOrderItemId: string; product: string; qty: string | number; unit: string;
    specifications: string; productionRequirements: string;
    requiredMaterials: { id: string; materialId: string; name: string; unit: string; requiredQuantity: number; issuedQuantity: number }[] }[];
}
export function jobPK(value: string): number {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error('Enter a positive numeric WorkflowJob ID.');
  return Number(value);
}
async function request<T>(path: string, command?: JobDraftCommand): Promise<T> {
  try { return (command ? await api.post<T>(`/production-workflow/job-drafts/${path}`, command, { timeout: 20000 }) :
    await api.get<T>(`/production-workflow/job-drafts/${path}`, { timeout: 15000 })).data; }
  catch (error) {
    const response = (error as { response?: { status: number; data?: { code?: string; detail?: string; fields?: unknown } } }).response;
    const data = response?.data;
    const detail = typeof data?.detail === 'string' ? data.detail : 'No confirmation received. Retry the exact pending command.';
    throw new DraftRequestError(`${data?.code ? `${data.code}: ` : ''}${detail}${data?.fields && Object.keys(data.fields as object).length ? ` ${JSON.stringify(data.fields)}` : ''}`,
      response?.status, response?.data?.code, response?.data?.fields);
  }
}
function record(row: JobDraftRecord, pk?: number) {
  if (!row || !Number.isSafeInteger(row.workflowKey) || row.workflowKey < 1 || pk && row.workflowKey !== pk ||
      !(row.workflowVersion === null || Number.isSafeInteger(row.workflowVersion) && row.workflowVersion > 0) ||
      !row.capabilities || row.capabilities.approve !== false || row.capabilities.issue !== false ||
      typeof row.capabilities.edit !== 'boolean' || !Array.isArray(row.operationalBlockCodes)) {
    throw new DraftRequestError('Malformed Job Card confirmation; retry the exact pending command.');
  }
  return row;
}
export const jobDraftApi = {
  capabilities: () => request<{ capabilities: { create: boolean }; operationalBlockCodes: string[] }>(''),
  read: async (pk: number) => record(await request<JobDraftRecord>(`${pk}/`), pk),
  save: async (pk: number | null, command: JobDraftCommand) => {
    const saved = record(await request<JobDraftRecord>(pk ? `${pk}/` : '', command), pk ?? undefined);
    if (saved.workflowVersion !== command.expectedVersion + 1 || saved.sourceConfirmedRevision !== command.sourceConfirmedRevision ||
        saved.salesOrderId !== `wf-order-${command.orderId}`) throw new DraftRequestError('Job Card confirmation does not match the pending command. Retry exactly.');
    return saved;
  },
  history: (pk: number) => request<unknown>(`${pk}/history/`),
};

type Pending = { pk: number | null; command: JobDraftCommand };
// Account-scoped retry identity survives refresh. UI and focused tests use this controller.
export class JobDraftCommands {
  pending: Pending | null = null;
  busy = false;
  conflict = false;
  private key: string;
  constructor(private actor: string, private storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, private transport = jobDraftApi) {
    this.key = `task05-job-pending:${actor}`;
    const saved = storage.getItem(this.key);
    if (saved) {
      const parsed = JSON.parse(saved) as Pending;
      if (!parsed.command?.commandId || !(parsed.pk === null || Number.isSafeInteger(parsed.pk))) throw new Error('Invalid pending command storage.');
      this.pending = parsed;
    }
  }
  async save(pk: number | null, command: Omit<JobDraftCommand, 'commandId'>): Promise<JobDraftRecord | undefined> {
    if (this.busy || this.conflict) return;
    if (!this.actor || this.actor.startsWith('demo-')) throw new Error('Sign in with a Django test account.');
    this.busy = true;
    try {
      this.pending ??= { pk, command: { ...structuredClone(command), commandId: crypto.randomUUID() } };
      this.storage.setItem(this.key, JSON.stringify(this.pending));
      const result = await this.transport.save(this.pending.pk, this.pending.command);
      this.storage.removeItem(this.key);
      this.pending = null;
      return result;
    } catch (error) {
      if (error instanceof DraftRequestError && error.status && error.status >= 400 && error.status < 500) {
        this.storage.removeItem(this.key); this.pending = null;
        this.conflict = ['VERSION_CONFLICT', 'COMMAND_PAYLOAD_CONFLICT', 'SOURCE_REVISION_CHANGED'].includes(error.code ?? '');
      }
      throw error;
    } finally { this.busy = false; }
  }
}
