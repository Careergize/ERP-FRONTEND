import { useAuth } from './AuthContext';
import { workflowRequest } from '@/lib/productionWorkflowApi';
import { createContext, useContext, useRef, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type SalesOrderDraft } from '@/lib/salesOrders';
import type { SalesOrder } from '@/types';

interface OrdersContextValue {
  createSharedSalesOrder: (draft: SalesOrderDraft) => Promise<SalesOrder>;
  orders: SalesOrder[];
  getOrders: () => SalesOrder[];
  linkFinishedProduct: (orderId: string, itemId: string, productId: string) => void;
  linkEstimate: (orderId: string, itemId: string, estimateId: string) => void;
  linkJob: (orderId: string, jobId: string) => void;
  createSalesOrder: (draft: SalesOrderDraft) => Promise<SalesOrder>;
  loading: boolean;
  loadError: string;
  reloadOrders: () => Promise<void>;
}
const OrdersContext = createContext<OrdersContextValue | undefined>(undefined);
export function SalesOrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const current = useRef(orders);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState('');
  const owner = useRef(user?.id); owner.current = user?.id;
  const sequence = useRef(0);
  const reloadOrders = useCallback(async () => {
    const account = user?.id, attempt = ++sequence.current;
    if (!account || account.startsWith('demo-')) {
      current.current = []; setOrders([]); setLoading(false);
      setLoadError(account ? 'Sign in with a Django account to load Sales Orders.' : ''); return;
    }
    setLoading(true); setLoadError('');
    try {
      const saved = await workflowRequest<SalesOrder[]>('orders/');
      if (!Array.isArray(saved) || !saved.every(order => order && typeof order.id === 'string' && typeof order.orderNumber === 'string' && Array.isArray(order.items) && Array.isArray(order.jobCardIds))) throw new Error('The server returned invalid Sales Order data. Reload or check the backend.');
      if (owner.current === account && sequence.current === attempt) { current.current = saved; setOrders(saved); }
    } catch (error) { if (owner.current === account && sequence.current === attempt) { current.current = []; setOrders([]); setLoadError(error instanceof Error ? error.message : 'Unable to load Sales Orders.'); } }
    finally { if (owner.current === account && sequence.current === attempt) setLoading(false); }
  }, [user?.id]);
  useEffect(() => { sequence.current++; current.current = []; setOrders([]); void reloadOrders(); }, [reloadOrders]);
  const createSharedSalesOrder = async (draft: SalesOrderDraft) => {
    if (!user || !['admin', 'receptionist'].includes(user.role)) throw new Error('Only Receptionist/Admin can create Sales Orders.');
    if (user.id.startsWith('demo-')) throw new Error('Sign in with a Django account to create a Sales Order.');
    const account = user.id;
    const saved = await workflowRequest<SalesOrder>('orders/', { ...draft, creationKey: draft.creationKey ?? crypto.randomUUID() });
    if (owner.current !== account) throw new Error('The signed-in account changed. Reload Sales Orders.');
    sequence.current++; setLoading(false); setLoadError('');
    current.current = [saved, ...current.current.filter(order => order.id !== saved.id)]; setOrders(current.current); return saved;
  };
  return <OrdersContext.Provider value={{ orders, getOrders: () => current.current, createSalesOrder: createSharedSalesOrder, createSharedSalesOrder, loading, loadError, reloadOrders, linkFinishedProduct: (orderId, itemId, productId) => { current.current = current.current.map(o => o.id === orderId ? { ...o, items: o.items?.map(i => i.id === itemId ? { ...i, itemId: productId } : i) } : o); setOrders(current.current); }, linkEstimate: (orderId, itemId, estimateId) => { current.current = current.current.map(o => o.id === orderId ? { ...o, items: o.items?.map(i => i.id === itemId ? { ...i, estimateId } : i) } : o); setOrders(current.current); }, linkJob: (orderId, jobId) => { current.current = current.current.map(o => o.id === orderId ? { ...o, jobCardIds: [...new Set([...o.jobCardIds, jobId])] } : o); setOrders(current.current); } }}>{children}</OrdersContext.Provider>;
}
export function useSalesOrders() {
  const value = useContext(OrdersContext);
  if (!value) throw new Error('SalesOrdersProvider is required');
  return value;
}
