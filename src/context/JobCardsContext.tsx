import { workflowRequest } from '@/lib/productionWorkflowApi';
import { appendProductionRun, type ProductionRun } from '@/lib/productionRuns';
import { useQuality } from './QualityContext';
import { assertMachineQC, assertProductionQC, finishedAuthorization, rawHeldQuantity } from '@/lib/qualityIntegration';
import { rawMaterialBalance } from '@/lib/rawMaterialData';
import { assertCompleteManufacturingScope, findWorkItem, parentForItem, summarizeParent } from '@/lib/parentJobCards';
import { createContext, useCallback, useContext, useRef, useState, useEffect, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { approveJobCard, issueJobMaterials, updateJobStage, transferJobToStock, editJobCard, toggleJobStage, type StageUpdate, type StockReceiptOptions } from '@/lib/jobCards';
import { useInventory } from './InventoryContext';
import { useCosting } from './CostingContext';
import { estimateMatchesOrder, materialRequirements } from '@/lib/customCosting';
import { changeRouting, reopenRouting, validateRouting } from '@/lib/productionRouting';
import { FINISHED_BY_ID } from '@/lib/finishedGoodsData';
import { useAuth } from './AuthContext';
import { useSalesOrders } from './SalesOrdersContext';
import type { JobCard } from '@/types';

interface JobCardsState {
  recordRun: (id: string, run: ProductionRun, finish: boolean) => void;
  registerBatch: (id: string, stageId: string, number: string, quantity: number) => NonNullable<JobCard['productionBatches']>[number];
  createLinked: (orderId: string, itemId: string, modelId: string, requiredDate: string, specifications: string, materials: NonNullable<JobCard["requiredMaterials"]>, estimateId?: string) => Promise<JobCard>;
  workflowError: string;
  cards: JobCard[];
  loading: boolean;
  load: () => Promise<void>;
  loadDetail: (id: string) => Promise<void>;
  postPreparedReceipts: (id: string, productId: string) => void;
  saveRouting: (id: string, stages: NonNullable<JobCard['productionStages']>, materials: NonNullable<JobCard['requiredMaterials']>) => void | Promise<void>;
  reviseRouting: (id: string) => void;
  recalculate: (id: string, estimateId: string) => void;
  sendForReview: (id: string) => void;
  approve: (id: string) => void | Promise<void>;
  issue: (id: string, quantities: Record<string, number>, available: Record<string, number | null>) => void | Promise<void>;
  updateStage: (id: string, stageId: string, update: StageUpdate) => void;
  transfer: (id: string, accepted: number, batchDate: string, receipt?: StockReceiptOptions) => void;
  edit: (id: string, change: Parameters<typeof editJobCard>[1]) => void | Promise<void>;
  toggleStage: (id: string, stageId: string) => void;
  saveSequence: (id: string) => Promise<boolean>;
}
const Context = createContext<JobCardsState | undefined>(undefined);
const validCard = (value: JobCard) => value && typeof value.id === 'string' && typeof value.jobCardNumber === 'string' && Array.isArray(value.stages);
export function JobCardsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const quality = useQuality();
  const { orders, linkJob, linkFinishedProduct } = useSalesOrders();
  const { estimates, invalidate, bindJob } = useCosting();
  const { postReceipt, rawMovements, reloadRaw, rawMaterials: RAW_MATERIALS } = useInventory();
  const orderRef = useRef(orders); orderRef.current = orders;
  const [cards, setCards] = useState<JobCard[]>([]);
  const current = useRef<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [workflowError, setWorkflowError] = useState('');
  const owner = useRef(user?.id); owner.current = user?.id;
  const request = useRef<Promise<void>>();
  const publish = (next: JobCard[]) => { current.current = next; setCards(next); };
  const load = useCallback(() => {
    const account = user?.id;
    if (!account || account.startsWith('demo-')) {
      publish([]); setLoading(false);
      setWorkflowError(account ? 'Sign in with a Django account to load Job Cards from the server.' : '');
      return Promise.resolve();
    }
    if (!request.current) {
      setLoading(true); setWorkflowError('');
      request.current = workflowRequest<JobCard[]>('jobs/').then(shared => {
        if (!Array.isArray(shared) || !shared.every(validCard)) throw new Error('The server returned invalid Job Card data. Reload or check the backend.');
        if (owner.current === account) publish(shared);
      }).catch(e => { if (owner.current === account) { publish([]); setWorkflowError(e.message); } }).finally(() => { if (owner.current === account) { setLoading(false); request.current = undefined; } });
    }
    return request.current;
  }, [user?.id]);
  useEffect(() => { request.current = undefined; publish([]); void load(); }, [load]);
  const remoteAction = async (id: string, action: string, data: object = {}) => {
    const parent = parentForItem(current.current, id);
    if (!parent?.persistedWorkflow) throw new Error('Shared Job Card not found.');
    const saved = await workflowRequest<JobCard>(`jobs/${parent.workflowKey}/${action}/`, { expectedVersion: parent.workflowVersion, itemId: id, ...data });
    publish(current.current.map(card => card.id === saved.id ? saved : card));
  };
  const loadDetail = useCallback((_id: string) => load(), [load]);
  const mutate = (id: string, change: (card: JobCard) => JobCard) => {
    if (!user) throw new Error('Sign in to update job cards.');
    const card = current.current.find(c => c.id === id) ?? findWorkItem(current.current, id);
    if (!card) throw new Error('Job card not found.');
    const next = change(card);
    publish(current.current.map(c => c.id === id ? next : c.manufacturingItems?.some(i => i.id === id) ? summarizeParent(c, c.manufacturingItems.map(i => i.id === id ? next : i)) : c));
  };
  const saveSequence = async (id: string) => {
    if (!user || !['admin', 'receptionist', 'production_manager'].includes(user.role)) throw new Error('Your role cannot save stage requirements.');
    const card = findWorkItem(current.current, id);
    if (!card || card.approval || !['Draft', 'PendingApproval'].includes(card.status)) throw new Error('Completed job card stage requirements are locked.');
    let persisted = false;
    try { if (!card.estimateId && !card.parentJobCardId) { await api.patch(`/job-cards/${id}/stages/`, { stages: card.stages }); persisted = true; } } catch { /* Existing API fallback stays explicit in the UI. */ }
    mutate(id, latest => ({ ...latest, activityHistory: [...(latest.activityHistory ?? []), { id: crypto.randomUUID(), timestamp: new Date().toISOString(), action: 'Stage requirements saved', user: user.name, department: 'Production Manager', description: persisted ? 'Existing stage API accepted the request; manufacturing tracking remains frontend-only.' : 'Saved in frontend state only; stage API was unavailable.' }] }));
    return persisted;
  };
  const createLinked: JobCardsState['createLinked'] = async (orderId) => {
    if (!user || !['admin', 'receptionist'].includes(user.role)) throw new Error('Only Receptionist/Admin can allocate Job Cards.');
    if (user.id.startsWith('demo-') || !orderId.startsWith('wf-order-')) throw new Error('Save a Sales Order through the shared API before allocating its Job Card. Sample or session-only orders cannot create Job Cards.');
    const parent = await workflowRequest<JobCard>(`orders/${orderId.replace('wf-order-', '')}/allocate/`, {});
    publish([...current.current.filter(card => card.id !== parent.id), parent]); linkJob(orderId, parent.id); return parent;
  };
  return <Context.Provider value={{ createLinked, workflowError, cards, loading, load, loadDetail,
    registerBatch: (id, stageId, number, quantity) => {
      if (!user || !['admin', 'qc_inspector', 'qc_supervisor'].includes(user.role)) throw new Error('QC staff/Admin registers inspection lots.');
      const card = findWorkItem(current.current, id); const stage = card?.productionStages?.find(s => s.id === stageId);
      if (!card || !stage || stage.status !== 'Completed' || !number.trim() || !Number.isFinite(quantity) || quantity <= 0 || !stage.outputUnit) throw new Error('Use a completed stage, actual batch number and positive quantity in its output unit.');
      const existing = card.productionBatches?.find(b => b.stageId === stageId && b.number === number.trim());
      if (existing) { if (existing.quantity !== quantity) throw new Error('The existing QC lot quantity is immutable.'); return existing; }
      if ((card.productionBatches ?? []).filter(b => b.stageId === stageId).reduce((sum, b) => sum + b.quantity, 0) + quantity > (stage.outputQuantity ?? 0)) throw new Error('QC lots cannot exceed this stage output.');
      const batch = { id: crypto.randomUUID(), number: number.trim(), stageId, quantity, unit: stage.outputUnit, createdAt: new Date().toISOString() };
      mutate(id, c => ({ ...c, productionBatches: [...(c.productionBatches ?? []), batch] })); return batch;
    },
    postPreparedReceipts: (id, productId) => mutate(id, card => {
      if (!['admin', 'store_keeper'].includes(user!.role) || !card.stockReceiptPending || !card.approval || !card.stockTransfers?.length) throw new Error('Store/Admin can post QC-prepared receipts once.');
      for (const receipt of card.stockTransfers) finishedAuthorization(quality.getState(), card, receipt.batch, 0, 0);
      const product = FINISHED_BY_ID.get(productId);
      if (!product || product.unit !== card.stockTransfer?.unit || card.stockTransfers.some(r => r.date < product.openingDate)) throw new Error('Choose an exact finished product with matching output unit and valid opening date. No package conversion is assumed.');
      for (const receipt of card.stockTransfers) if (receipt.quantity > 0) postReceipt({ stockApprovalId: finishedAuthorization(quality.getState(), card, receipt.batch, 0, 0).id, qualityReleaseId: quality.getState().releases.find(r => r.purpose === "quality" && r.inspectionId === finishedAuthorization(quality.getState(), card, receipt.batch, 0, 0).inspectionId)?.id, id: receipt.id, productId: product.id, date: receipt.date, type: 'IN', quantity: receipt.quantity, unit: product.unit, salesOrderId: card.salesOrderId, salesOrderItemId: card.salesOrderItemId, jobCardId: card.parentJobCardId ?? card.id, manufacturingItemId: card.id, modelId: card.modelId, modelName: card.modelName, batch: receipt.batch, reference: card.jobCardNumber, customer: card.customerName, remarks: 'QC-prepared receipt explicitly mapped by Store.' });
      if (card.salesOrderItemId) linkFinishedProduct(card.salesOrderId, card.salesOrderItemId, productId);
      const produced = card.productionStages?.filter(s => s.required && s.kind === 'production').at(-1)?.outputQuantity ?? 0;
      return { ...card, finishedProductId: productId, stockReceiptPending: false, status: (card.acceptedQuantity ?? 0) + (card.rejectedQuantity ?? 0) >= produced ? 'Completed' : 'ReadyForStock', activityHistory: [...(card.activityHistory ?? []), { id: crypto.randomUUID(), timestamp: new Date().toISOString(), action: 'Prepared Stock IN posted', user: user!.name, department: 'Store', description: `Mapped exact product ${product.id}; QC batches posted to shared frontend inventory.` }] };
    }),
    saveRouting: async (id, stages, materials) => { if (parentForItem(current.current, id)?.persistedWorkflow) { await remoteAction(id, 'edit', { change: { productionStages: stages, requiredMaterials: materials } }); return; } mutate(id, card => { const next = changeRouting(card, stages, materials, user!); if (card.estimateId) invalidate(card.estimateId, 'Production routing/material requirements changed. Recalculate process costs and requirements.'); return next; }); },
    reviseRouting: id => mutate(id, card => { const next = reopenRouting(card, user!); if (card.estimateId) invalidate(card.estimateId, 'Routing reapproval requested.'); return next; }),
    recalculate: (id, estimateId) => mutate(id, card => {
      if (!['admin', 'production_manager'].includes(user!.role) || card.approval || !['Draft', 'PendingApproval'].includes(card.status)) throw new Error('Requirements can only be recalculated by PM/Admin before approval.');
      const estimate = estimates.find(e => e.id === estimateId);
      if (!estimate || estimate.status !== 'Approved' || !estimateMatchesOrder(estimate, card.salesOrderId, card.salesOrderItemId) || estimate.input.modelId !== card.modelId || estimate.input.modelRevision !== card.modelRevision) throw new Error('Select an internally approved, recalculated estimate for this line and model revision.');
      bindJob(estimate.id, card.id);
      return { ...card, requiredMaterials: materialRequirements(estimate.input), estimateId: estimate.id, estimateRevision: estimate.revision, requirementsReviewRequired: false, activityHistory: [...(card.activityHistory ?? []), { id: crypto.randomUUID(), timestamp: new Date().toISOString(), action: 'Requirements recalculated', user: user!.name, department: 'Production Manager', description: `Applied ${estimate.number} revision ${estimate.revision}. Explicit recipe quantities and costs were reviewed.` }] };
    }),
    sendForReview: id => mutate(id, card => {
      if (!['admin', 'production_manager', 'receptionist'].includes(user!.role) || card.status !== 'Draft') throw new Error('Only draft jobs can be sent for PM review.');
      return { ...card, status: 'PendingApproval', activityHistory: [...(card.activityHistory ?? []), { id: crypto.randomUUID(), timestamp: new Date().toISOString(), action: 'Sent for PM review', user: user!.name, department: 'Production Manager', description: 'Draft Job Card submitted for routing and material review.' }] };
    }),
    approve: async id => {
      if (parentForItem(current.current, id)?.persistedWorkflow) { await remoteAction(id, 'approve'); return; }
      if (!user || !['admin', 'production_manager'].includes(user.role)) throw new Error('Your role cannot approve Job Cards.');
      const parent = parentForItem(current.current, id);
      if (parent?.manufacturingItems) {
        assertCompleteManufacturingScope(parent, orderRef.current.find(o => o.id === parent.salesOrderId));
        // Validate every item before publishing any approval; no partially approved parent.
        const approved = parent.manufacturingItems.map(card => {
          if (card.estimateId) { const estimate = estimates.find(e => e.id === card.estimateId); if (!estimate || ['Revision Required', 'Superseded'].includes(estimate.status)) throw new Error('Linked costing requires recalculation/review.'); validateRouting(card.productionStages ?? []); }
          return card.approval ? card : approveJobCard(card, user!);
        });
        mutate(parent.id, () => summarizeParent(parent, approved));
      } else mutate(id, card => { if (card.estimateId) { const estimate = estimates.find(e => e.id === card.estimateId); if (!estimate || ['Revision Required', 'Superseded'].includes(estimate.status)) throw new Error('Linked costing requires recalculation/review.'); validateRouting(card.productionStages ?? []); } return approveJobCard(card, user!); });
    },
    issue: async (id, quantities, available) => { if (parentForItem(current.current, id)?.persistedWorkflow) { const child = findWorkItem(current.current, id); if (!child) throw new Error('Select a manufacturing item.'); for (const row of child.requiredMaterials ?? []) { const held = rawHeldQuantity(quality.getState(), rawMovements, row.materialId ?? ''); const balance = available[row.id]; if (held > 0 && (balance == null || (quantities[row.id] ?? 0) > Math.max(0, balance - held))) throw new Error('A QC hold prevents issue of this quantity.'); } await remoteAction(id, 'issue', { quantities }); await reloadRaw(); return; } mutate(id, card => {
      const usable = { ...available };
      for (const material of card.requiredMaterials ?? []) {
        const raw = RAW_MATERIALS.find(r => r.id === material.materialId && r.unit === material.unit);
        if (!raw) throw new Error('Resolve the exact raw material master before ordinary issue.');
        const balance = rawMaterialBalance(raw, rawMovements).currentStock;
        const held = rawHeldQuantity(quality.getState(), rawMovements, raw.id);
        if (held > 0 && balance === null && (quantities[material.id] ?? 0) > 0) throw new Error('Unknown raw balance with pending QC cannot be issued.');
        usable[material.id] = balance === null ? null : Math.max(0, balance - held);
      }
      return issueJobMaterials(card, quantities, usable, user!);
    }); },
    recordRun: (id,run,finish) => mutate(id,card=>{assertMachineQC(quality.getState(),card.productionStages?.find(s=>s.id===run.stageId)?.machineId);assertProductionQC(quality.getState(),card,card.productionStages?.find(s=>s.id===run.stageId)?.sequence);return appendProductionRun(card,run,finish,user!);}),
    updateStage: (id, stageId, update) => mutate(id, card => { if(card.productionRuns?.some(r=>r.stageId===stageId)) throw new Error('Use additional production runs; run aggregates cannot be overwritten.'); assertMachineQC(quality.getState(), card.productionStages?.find(s => s.id === stageId)?.machineId); assertProductionQC(quality.getState(), card, card.productionStages?.find(s => s.id === stageId)?.sequence); return updateJobStage(card, stageId, update, user!); }),
    transfer: (id, accepted, date, receipt) => mutate(id, card => {
      if (!['admin', 'store_keeper'].includes(user!.role) || !receipt) throw new Error('Store/Admin must select an authorized QC batch and explicit accepted/rejected quantities.');
      const repeated = card.stockTransfers?.find(r => r.id === receipt.id);
      if (repeated) { if (repeated.quantity !== accepted || repeated.rejectedQuantity !== receipt.rejected || repeated.batch !== receipt.batch || repeated.date !== date) throw new Error('Receipt request ID conflicts with the recorded batch.'); return card; }
      const authorization = finishedAuthorization(quality.getState(), card, receipt?.batch ?? `LOT-${card.jobCardNumber}`, accepted, receipt?.rejected ?? 0);
      const next = transferJobToStock(card, accepted, date, user!, new Date().toISOString(), receipt);
      if (next === card) return card;
      if ((next.acceptedQuantity ?? 0) === 0 && next.status === 'Completed') return { ...next, stockReceiptPending: false };
      const product = FINISHED_BY_ID.get(card.finishedProductId ?? '');
      if (!product && !card.finishedProductId && card.salesOrderItemId) return { ...next, status: 'ReadyForStock', stockReceiptPending: true, activityHistory: [...(next.activityHistory ?? []), { id: crypto.randomUUID(), timestamp: new Date().toISOString(), action: 'Stock IN prepared', user: user!.name, department: 'Store', description: 'QC quantities and batches retained; choose an exact finished-goods variant/unit to post. No physical inventory change occurred.' }] };
      if (!product || product.unit !== next.stockTransfer!.unit || !card.salesOrderItemId) throw new Error('Link a finished product and Sales Order item with matching output unit before posting stock. Legacy demo cards cannot be matched by name.');
      if (accepted > 0) postReceipt({ stockApprovalId: authorization.id, qualityReleaseId: quality.getState().releases.find(r => r.purpose === "quality" && r.inspectionId === authorization.inspectionId)?.id, id: receipt?.id ?? `receipt-${card.id}`, productId: product.id, date, type: 'IN', quantity: accepted, unit: product.unit, salesOrderId: card.salesOrderId, salesOrderItemId: card.salesOrderItemId, jobCardId: card.parentJobCardId ?? card.id, manufacturingItemId: card.id, modelId: card.modelId, modelName: card.modelName, batch: receipt?.batch ?? `LOT-${card.jobCardNumber}`, reference: card.jobCardNumber, customer: card.customerName, remarks: 'Accepted quantity verified by Store; frontend receipt.' });
      return next;
    }),
    edit: async (id, change) => { if (parentForItem(current.current, id)?.persistedWorkflow) { await remoteAction(id, 'edit', { change }); return; } mutate(id, card => {
      if (card.salesOrderItemId && (change.qty !== card.qty || change.unit !== card.unit || change.product !== card.product || change.modelName !== card.modelName)) throw new Error('Linked order quantity, product, unit and selected model are locked. Edit specifications and delivery requirements instead.');
      return editJobCard(card, change, user!);
    }); },
    toggleStage: (id, stageId) => mutate(id, card => { const next = toggleJobStage(card, stageId, user!); if (card.estimateId) { invalidate(card.estimateId, 'Mandatory production stages changed.'); return { ...next, status: 'Draft', requirementsReviewRequired: true, routingRevision: (card.routingRevision ?? 1) + 1 }; } return next; }), saveSequence,
  }}>{children}</Context.Provider>;
}
export function useJobCards() {
  const value = useContext(Context);
  if (!value) throw new Error('JobCardsProvider is required');
  return value;
}
