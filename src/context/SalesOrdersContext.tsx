import { useAuth } from './AuthContext';
import { workflowRequest } from '@/lib/productionWorkflowApi';
import { createContext, useContext, useRef, useState, useEffect, type ReactNode } from 'react';
import { MOCK_SALES_ORDERS } from '@/lib/mockData';
import { buildSalesOrder, type SalesOrderDraft } from '@/lib/salesOrders';
import type { SalesOrder } from '@/types';

interface OrdersContextValue {
  createSharedSalesOrder: (draft: SalesOrderDraft) => Promise<SalesOrder>;
  orders: SalesOrder[];
  getOrders: () => SalesOrder[];
  linkFinishedProduct: (orderId: string, itemId: string, productId: string) => void;
  linkEstimate: (orderId: string, itemId: string, estimateId: string) => void;
  linkJob: (orderId: string, jobId: string) => void;
  createSalesOrder: (draft: SalesOrderDraft) => SalesOrder;
}
const OrdersContext = createContext<OrdersContextValue | undefined>(undefined);
export function SalesOrdersProvider({ children }: { children: ReactNode }) {
  // Temporary frontend-only store: survives navigation, resets on browser refresh.
  // TODO: Load orders and replace createSalesOrder with backend API calls.
  const [orders, setOrders] = useState<SalesOrder[]>(MOCK_SALES_ORDERS);
  const current = useRef(orders);
  const { user } = useAuth();
  useEffect(() => {
    let active = true; current.current = MOCK_SALES_ORDERS; setOrders(MOCK_SALES_ORDERS);
    if (user && !user.id.startsWith('demo-')) void workflowRequest<SalesOrder[]>('orders/').then(saved => { if (active) { current.current = [...current.current.filter(order => order.id.startsWith('wf-order-') && !saved.some(row => row.id === order.id)), ...saved, ...MOCK_SALES_ORDERS]; setOrders(current.current); } }).catch(() => { /* New workflow creation always requires a confirmed server save. */ });
    return () => { active = false; };
  }, [user?.id]);
  const createSharedSalesOrder = async (draft: SalesOrderDraft) => {
    if (!user || !['admin', 'receptionist'].includes(user.role)) throw new Error('Only Receptionist/Admin can create Sales Orders.');
    if (user.id.startsWith('demo-')) {
      if (draft.allocateJobCard && draft.items.some(item => item.fulfillmentSource === 'manufacturing')) throw new Error('Sign in with a Django account to allocate the shared approval workflow.');
      return createSalesOrder(draft);
    }
    const saved = await workflowRequest<SalesOrder>('orders/', { ...draft, creationKey: draft.creationKey ?? crypto.randomUUID() });
    current.current = [saved, ...current.current.filter(order => order.id !== saved.id)]; setOrders(current.current); return saved;
  };
  const createSalesOrder = (draft: SalesOrderDraft) => {
    const existing = draft.quotationId ? current.current.find(o => o.quotationId === draft.quotationId) : undefined;
    if (existing) return existing;
    const order = buildSalesOrder(draft, current.current);
    current.current = [order, ...current.current];
    setOrders(current.current);
    return order;
  };
  return <OrdersContext.Provider value={{ orders, getOrders: () => current.current, createSalesOrder, createSharedSalesOrder, linkFinishedProduct: (orderId, itemId, productId) => { current.current = current.current.map(o => o.id === orderId ? { ...o, items: o.items?.map(i => i.id === itemId ? { ...i, itemId: productId } : i) } : o); setOrders(current.current); }, linkEstimate: (orderId, itemId, estimateId) => { current.current = current.current.map(o => o.id === orderId ? { ...o, items: o.items?.map(i => i.id === itemId ? { ...i, estimateId } : i) } : o); setOrders(current.current); }, linkJob: (orderId, jobId) => { current.current = current.current.map(o => o.id === orderId ? { ...o, jobCardIds: [...new Set([...o.jobCardIds, jobId])] } : o); setOrders(current.current); } }}>{children}</OrdersContext.Provider>;
}
export function useSalesOrders() {
  const value = useContext(OrdersContext);
  if (!value) throw new Error('SalesOrdersProvider is required');
  return value;
}
