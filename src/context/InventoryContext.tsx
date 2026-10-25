import { useSharedEntry, useRefreshSharedEntry } from '@/context/SharedEntriesContext';
import { useSalesOrders } from './SalesOrdersContext';
import { api } from '@/lib/api';
import { FINISHED_GOODS, replaceFinishedCatalog, type FinishedGood } from '@/lib/finishedGoodsData';
import { useAuth } from './AuthContext';
import { useQuality } from './QualityContext';
import { subjectHeld } from '@/lib/quality';
import { assertManualFinishedINQC, assertFinishedReceiptQC, rawHeldQuantity } from '@/lib/qualityIntegration';
import { rawMaterialBalance } from '@/lib/rawMaterialData';
import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { fetchRawInventory, postRawMovement, persistRawPlan, inventoryError } from '@/lib/rawInventoryApi';
import { validatePlan, type ProcurementItem } from '@/lib/procurement';
import { FINISHED_BY_ID, type FinishedGoodsMovement } from '@/lib/finishedGoodsData';
import { allocate, confirmDirectDispatch, confirmDispatch, confirmDispatchBatch, reverseDispatch, reserved, physical, batchPhysical, type FulfillmentLedger, type DispatchBatchEntry } from '@/lib/fulfillment';
import type { SalesOrder, SalesOrderItem } from '@/types';
import { RAW_MATERIALS, RAW_MOVEMENTS, type RawMaterial, type RawMaterialMovement } from '@/lib/rawMaterialData';
import { snapshotMovements, validateConversion, validateThreshold, type ProductConversion, type StockThreshold } from '@/lib/stockIntelligence';

interface InventoryContextValue {
  previewDispatchBatch: (order: SalesOrder, entries: DispatchBatchEntry[]) => void;
  dispatchBatch: (orderId: string, entries: DispatchBatchEntry[]) => void;
  finishedProducts: FinishedGood[];
  finishedLoading: boolean;
  finishedError: string;
  reloadFinished: () => Promise<void>;
  conversions: ProductConversion[];
  thresholds: StockThreshold[];
  saveConversion: (draft: Omit<ProductConversion, 'id' | 'version'>) => void;
  saveThreshold: (draft: StockThreshold) => void;
  directDispatch: (order: SalesOrder, item: SalesOrderItem, batch: string, draft: Parameters<typeof confirmDirectDispatch>[4]) => void;
  ledger: FulfillmentLedger;
  allocateStock: (order: SalesOrder, item: SalesOrderItem, quantity: number, batch: string, requestId?: string) => void;
  dispatch: (draft: Parameters<typeof confirmDispatch>[1]) => void;
  reverse: (id: string, date: string, reason: string) => void;
  postReceipt: (movement: FinishedGoodsMovement) => void;
  finishedMovements: FinishedGoodsMovement[];
  finishedPieces: Record<string, number>;
  updateFinishedPieces: (productId: string, pieces: number) => void;
  rawMovements: RawMaterialMovement[];
  rawMaterials: RawMaterial[];
  rawPlans: ProcurementItem[];
  rawLoading: boolean;
  rawError: string;
  rawCanPost: boolean;
  rawCanPlan: boolean;
  reloadRaw: () => Promise<void>;
  saveRawPlan: (plan: ProcurementItem) => Promise<void>;
  addFinishedMovement: (movement: Omit<FinishedGoodsMovement, 'id'> & { requestId?: string }) => void;
  addRawMovement: (movement: Omit<RawMaterialMovement, 'id'> & {requestId?: string}) => Promise<void>;
}
const InventoryContext = createContext<InventoryContextValue | undefined>(undefined);
export function InventoryProvider({ children }: { children: ReactNode }) {
  const refreshSharedEntry = useRefreshSharedEntry();
  const { getOrders } = useSalesOrders();
  const quality = useQuality(); const { user } = useAuth();
  const [conversions, setConversions] = useSharedEntry<ProductConversion[]>('inventory-conversions', []); const conversionRef = useRef(conversions); conversionRef.current = conversions;
  const [thresholds, setThresholds] = useSharedEntry<StockThreshold[]>('inventory-thresholds', []);
  const [storedLedger, setLedger] = useSharedEntry<FulfillmentLedger>('inventory-ledger', { movements: [], allocations: [], dispatches: [] });
  const [purchaseReceipts, setPurchaseReceipts] = useState<FinishedGoodsMovement[]>([]);
  const ledger = { ...storedLedger, movements: [...storedLedger.movements, ...purchaseReceipts] };
  const current = useRef(ledger); current.current = ledger;
  const publish = (next: FulfillmentLedger) => { next={...next,movements:snapshotMovements(current.current.movements,next.movements,conversionRef.current)}; setLedger({ ...next, movements: next.movements.filter(m => !m.purchaseOrderId && !m.goodsReceivedNoteId) }); current.current=next; };
  const finishedMovements = ledger.movements;
  const postReceipt = (movement: FinishedGoodsMovement) => {
    const existing = current.current.movements.find(m => m.id === movement.id);
    if (existing) { if (existing.productId !== movement.productId || existing.quantity !== movement.quantity || existing.date !== movement.date || existing.unit !== movement.unit || existing.batch !== movement.batch || existing.stockApprovalId !== movement.stockApprovalId) throw new Error('Receipt request ID conflicts with an existing transaction.'); return; }
    const product = FINISHED_BY_ID.get(movement.productId);
    if (movement.jobCardId || movement.manufacturingItemId || movement.stockApprovalId || movement.qualityReleaseId) assertFinishedReceiptQC(quality.getState(), movement, current.current.movements);
    if (!product || movement.type !== 'IN' || !movement.id || !Number.isFinite(Date.parse(movement.date)) || product.unit !== movement.unit || movement.quantity <= 0 || !Number.isFinite(movement.quantity) || movement.date < product.openingDate) throw new Error('Receipt product, unit, quantity or date is invalid.');
    publish({ ...current.current, movements: [...current.current.movements, movement] });
  };
  const [finishedPieces, setFinishedPieces] = useSharedEntry<Record<string, number>>('inventory-pieces', {});
  const updateFinishedPieces = (productId: string, pieces: number) => {
    if (!FINISHED_BY_ID.has(productId) || !Number.isSafeInteger(pieces) || pieces <= 0) throw new Error('Invalid pieces');
    setFinishedPieces(current => ({ ...current, [productId]: pieces }));
  };
  const [rawMovements, setRaw] = useState(RAW_MOVEMENTS);
  const rawCurrent = useRef(rawMovements);
  const [rawMaterials,setRawMaterials]=useState<RawMaterial[]>(RAW_MATERIALS);
  const [rawPlans,setRawPlans]=useState<ProcurementItem[]>([]);
  const [rawLoading,setRawLoading]=useState(true),[rawError,setRawError]=useState('');
  const [rawCanPost,setRawCanPost]=useState(false),[rawCanPlan,setRawCanPlan]=useState(false);
  const owner=useRef(user?.id); owner.current=user?.id;
  const [finishedProducts, setFinishedProducts] = useState<FinishedGood[]>(FINISHED_GOODS);
  const [finishedLoading, setFinishedLoading] = useState(false);
  const [finishedError, setFinishedError] = useState('');
  const finishedSequence = useRef(0);
  const reloadFinished = useCallback(async () => {
    const account = user?.id, sequence = ++finishedSequence.current;
    if (!account || account.startsWith('demo-')) return;
    setFinishedLoading(true); setFinishedError('');
    try {
      const { data } = await api.get<{ products: FinishedGood[]; receipts: FinishedGoodsMovement[] }>('/finished-stock/', { timeout: 15000 });
      if (owner.current !== account || finishedSequence.current !== sequence) return;
      replaceFinishedCatalog(data.products); setFinishedProducts(data.products);
      await refreshSharedEntry('inventory-ledger');
      const next = { ...current.current, movements: [...current.current.movements.filter(m => !m.purchaseOrderId), ...data.receipts] };
      current.current = next; setPurchaseReceipts(data.receipts);
    } catch (error) {
      if (owner.current === account && finishedSequence.current === sequence) setFinishedError(inventoryError(error));
    } finally {
      if (owner.current === account && finishedSequence.current === sequence) setFinishedLoading(false);
    }
  }, [user?.id, refreshSharedEntry]);
  useEffect(() => {
    finishedSequence.current++;
    replaceFinishedCatalog(); setFinishedProducts(FINISHED_GOODS);
    setPurchaseReceipts([]); setFinishedError('');
    setFinishedLoading(!!user && !user.id.startsWith('demo-'));
    void reloadFinished();
  }, [reloadFinished]);
  const rawSequence=useRef(0);
  const reloadRaw=useCallback(async()=>{
    const account=user?.id, sequence=++rawSequence.current;
    if(!account)return;
    const demo=account.startsWith('demo-');
    if(demo){setRawLoading(false);return;}
    setRawLoading(true);setRawError('');
    try{
      const data=await fetchRawInventory();
      if(owner.current!==account||rawSequence.current!==sequence)return;
      setRawMaterials(data.materials);rawCurrent.current=data.movements;setRaw(data.movements);setRawPlans(data.plans);
      setRawCanPost(data.canPost);setRawCanPlan(data.canPlan);
    }catch(e){if(owner.current===account&&rawSequence.current===sequence)setRawError(inventoryError(e));}
    finally{if(owner.current===account&&rawSequence.current===sequence)setRawLoading(false);}
  },[user?.id]);
  useEffect(()=>{
    const demo=user?.id.startsWith('demo-');
    rawSequence.current++;
    rawCurrent.current=demo?RAW_MOVEMENTS:[];setRaw(rawCurrent.current);
    setRawMaterials(demo?RAW_MATERIALS:[]);setRawPlans([]);setRawError('');setRawLoading(!!user&&!demo);
    setRawCanPost(!!demo&&['admin','store_keeper'].includes(user?.role??''));
    setRawCanPlan(!!demo&&['admin','store_keeper','production_manager','project_manager','accounts'].includes(user?.role??''));
    void reloadRaw();
  },[reloadRaw,user?.role]);
  const saveRawPlan=async(plan:ProcurementItem)=>{
    if (user?.id.startsWith('demo-')) throw new Error('A real backend account is required to save procurement plans.');
    const account=user?.id;
    if(!account||rawLoading||rawError||!rawCanPlan)throw new Error('Load inventory and check your procurement permissions before saving.');
    validatePlan(plan);
    const material=rawMaterials.find(m=>m.id===plan.materialId);
    if(!material||material.unit!==plan.unit)throw new Error('Select the exact saved raw material and unit.');
    const saved=account.startsWith('demo-')?structuredClone(plan):await persistRawPlan(plan).catch(e=>{throw new Error(inventoryError(e));});
    if(owner.current===account){rawSequence.current++;setRawPlans(old=>[...old.filter(p=>p.materialId!==saved.materialId),saved]);}
  };
  const addFinishedMovement = (movement: Omit<FinishedGoodsMovement, 'id'> & { requestId?: string }) => {
    const { requestId, ...entry } = movement;
    const repeated = requestId ? current.current.movements.find(row => row.id === requestId) : undefined;
    if (repeated) { if (Object.entries(entry).some(([key, value]) => (repeated as unknown as Record<string, unknown>)[key] !== value)) throw new Error('This movement request ID was already used with different details.'); return; }
    const product = FINISHED_BY_ID.get(movement.productId);
    if (!product || product.unit !== movement.unit || !Number.isFinite(movement.quantity) || movement.quantity <= 0) throw new Error('Invalid finished goods movement');
    if (movement.type === 'IN') assertManualFinishedINQC(quality.getState(), user?.role, movement.productId);
    if (movement.jobCardId || movement.manufacturingItemId) throw new Error('Use the authorized production receipt workflow for manufactured stock.');
    if (movement.date < product.openingDate) throw new Error('Movement precedes reference opening.');
    if (movement.type === 'OUT') { if (!['admin','store_keeper'].includes(user?.role ?? '') || !['transfer','waste','adjustment'].includes(movement.movementPurpose ?? '') || !movement.reference?.trim() || !movement.remarks?.trim()) throw new Error('Store/Admin records a non-sales OUT purpose, reference and reason; use confirmed dispatch for sales.'); if (movement.movementPurpose==='adjustment' && user?.role!=='admin') throw new Error('Admin must approve and record adjustments.'); const balance = physical(current.current, product.id); if (balance === null || movement.quantity > balance - reserved(current.current, product.id) || movement.quantity > (batchPhysical(current.current, product.id, 'reference-stock') ?? 0) - reserved(current.current, product.id, 'reference-stock')) throw new Error('Stock OUT exceeds known unreserved stock.'); }
    publish({ ...current.current, movements: [...current.current.movements, { ...entry, batch: 'reference-stock', id: requestId ?? crypto.randomUUID() }] });
  };
  const addRawMovement = async (movement: Omit<RawMaterialMovement, 'id'> & {requestId?: string}) => {
    if (user?.id.startsWith('demo-')) throw new Error('A real backend account is required to save raw-material movements.');
    const account=user?.id;
    if(!account||rawLoading||rawError||!rawCanPost)throw new Error('Load inventory and check your Stock IN/OUT permissions before posting.');
    const material = rawMaterials.find(m => m.id === movement.materialId);
    if (!material || material.category !== movement.category || material.unit !== movement.unit || !Number.isFinite(movement.quantity) || movement.quantity <= 0) throw new Error('Invalid raw material movement');
    if (movement.movementType === 'OUT') { const balance = rawMaterialBalance(material, rawCurrent.current).currentStock; const held = rawHeldQuantity(quality.getState(), rawCurrent.current, material.id); if (held > 0 && (balance === null || movement.quantity > Math.max(0, balance - held))) throw new Error('Raw Material OUT cannot consume pending/rejected QC receipts. Physical receipt is not acceptance.'); }
    const {requestId,...entry}=movement;
    const next={...entry,materialName:material.name,id:requestId??crypto.randomUUID()};
    const saved=account.startsWith('demo-')?next:await postRawMovement(next).catch(e=>{throw new Error(inventoryError(e));});
    if(owner.current!==account)return;
    rawSequence.current++;
    rawCurrent.current = [...rawCurrent.current.filter(m=>m.id!==saved.id),saved]; setRaw(rawCurrent.current);
  };
  const requireApprovedOrder = (order?: SalesOrder) => { if (!order?.salesOrderApproval) throw new Error('Production Manager or Admin must approve the Sales Order before Stock OUT.'); };
  const checkDispatchBatch = (order: SalesOrder, entries: DispatchBatchEntry[]) => {
    if (!['admin', 'store_keeper', 'receptionist'].includes(user?.role ?? '')) throw new Error('Your role cannot dispatch stock.');
    requireApprovedOrder(order);
    for (const entry of entries) {
      const item = order.items?.find(line => line.id === entry.itemId);
      if (!item) throw new Error('Select an exact Sales Order item.');
      const sale = entry.draft.sale;
      if (sale) {
        const line = sale.lines.find(row => row.itemId === entry.itemId);
        const taxRate = order.customerType === 'B2C' ? 0 : order.taxRate;
        const taxMode = order.customerType === 'B2C' ? 'exclusive' : order.commercialPricing?.taxMode ?? 'exclusive';
        if (!line || line.productId !== item.itemId || line.unit !== item.unit || line.quantity !== entry.draft.quantity || line.rate !== item.unitPrice || sale.customerName !== order.customerName || sale.customerType !== order.customerType || sale.marketingPersonName !== order.marketingPersonName || sale.requisitionOrder !== (order.requisitionOrder ?? '') || sale.currency !== order.currency || sale.taxRate !== taxRate || sale.taxMode !== taxMode || (order.customerType === 'B2C' && (sale.vat !== 0 || sale.led !== 0 || sale.lines.some(row => row.ledSnapshot)))) throw new Error('Order commercial details changed. Reload the order before confirming Stock OUT.');
      }
      const held = current.current.movements.some(m => m.productId === item.itemId && m.batch === entry.batch && m.manufacturingItemId && quality.getState().inspections.some(i => i.subject.manufacturingItemId === m.manufacturingItemId && i.subject.batchNumber === entry.batch && subjectHeld(quality.getState(), i.subject)));
      if (held) throw new Error('A QC hold prevents dispatch of this batch.');
      if (entry.draft.date < order.date) throw new Error('Dispatch date cannot precede the Sales Order.');
    }
    return confirmDispatchBatch(current.current, order, entries);
  };
  return <InventoryContext.Provider value={{ previewDispatchBatch: (order, entries) => { checkDispatchBatch(order, entries); }, dispatchBatch: (orderId, entries) => { const order = getOrders().find(row => row.id === orderId); if (!order) throw new Error('Select a saved Sales Order.'); publish(checkDispatchBatch(order, entries)); }, finishedProducts,finishedLoading,finishedError,reloadFinished,rawMaterials,rawPlans,rawLoading,rawError,rawCanPost,rawCanPlan,reloadRaw,saveRawPlan,conversions, thresholds,
    saveConversion: draft => { if (!['admin','production_manager'].includes(user?.role ?? '')) throw new Error('Admin/Production Manager manages conversions.'); const product = FINISHED_BY_ID.get(draft.productId); if (!product || product.unit !== draft.unit) throw new Error('Select exact product/unit.'); const next = { ...draft, id: crypto.randomUUID(), version: 1 + Math.max(0,...conversionRef.current.filter(c=>c.productId===draft.productId && c.modelId===draft.modelId).map(c=>c.version)) }; validateConversion(next); conversionRef.current=[...conversionRef.current,next]; setConversions(conversionRef.current); },
    saveThreshold: draft => { if (!['admin','store_keeper','production_manager'].includes(user?.role ?? '')) throw new Error('Your role cannot configure stock thresholds.'); if (FINISHED_BY_ID.get(draft.productId)?.unit !== draft.unit) throw new Error('Use exact stock unit.'); validateThreshold(draft); setThresholds(list=>[...list.filter(t=>t.productId!==draft.productId), structuredClone(draft)]); },
    directDispatch: (order,item,batch,draft) => { if (!['admin','store_keeper','receptionist'].includes(user?.role ?? '')) throw new Error('Your role cannot dispatch stock.'); const stored=getOrders().find(o=>o.id===order.id),line=stored?.items?.find(i=>i.id===item.id);if(!stored||!line)throw new Error('Select a current Sales Order line.'); requireApprovedOrder(stored); const held=current.current.movements.some(m=>m.productId===line.itemId && m.batch===batch && m.manufacturingItemId && quality.getState().inspections.some(i=>i.subject.manufacturingItemId===m.manufacturingItemId && i.subject.batchNumber===batch && subjectHeld(quality.getState(),i.subject))); if(held) throw new Error('A QC hold prevents dispatch of this batch.'); publish(confirmDirectDispatch(current.current,stored,line,batch,draft)); },
    ledger, postReceipt, allocateStock: (order, item, quantity, batch, requestId) => { requireApprovedOrder(order); publish(allocate(current.current, order, item, quantity, batch, requestId)); }, dispatch: draft => {
    const a = current.current.allocations.find(a => a.id === draft.allocationId);
    requireApprovedOrder(getOrders().find(o => o.id === a?.orderId));
    if (a && current.current.movements.some(m => m.productId === a.productId && m.batch === a.batch && m.manufacturingItemId && quality.getState().inspections.some(i => i.subject.manufacturingItemId === m.manufacturingItemId && i.subject.batchNumber === a.batch && subjectHeld(quality.getState(), i.subject)))) throw new Error('A QC hold prevents dispatch of this batch.');
    publish(confirmDispatch(current.current, draft));
  }, reverse: (id, date, reason) => publish(reverseDispatch(current.current, id, date, reason)), finishedMovements, finishedPieces, updateFinishedPieces, rawMovements, addFinishedMovement, addRawMovement }}>{children}</InventoryContext.Provider>;
}
export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('InventoryProvider is required');
  return context;
}
