import { ProcessManager } from '@/pages/Masters/ProcessManager';
import { ActivityHistory } from '@/pages/ActivityHistory';
import { SharedEntriesProvider } from '@/context/SharedEntriesContext';
import { CommercialProvider } from '@/context/CommercialContext';
import { ProcurementPlanner } from '@/pages/ProcurementPlanner';
import { PurchaseOrders, PurchaseOrderEditor, PurchaseOrderDetail } from '@/pages/PurchaseOrders';
import { GoodsReceivedNotes, GoodsReceivedNoteEditor, GoodsReceivedNoteDetail } from '@/pages/GoodsReceivedNotes';
import { ModelManager } from '@/pages/Masters/ModelManager';
import { QuotationsProvider } from '@/context/QuotationsContext';
import { QuotationList, QuotationsGuard } from '@/pages/Quotations/QuotationList';
import { QuotationDetail } from '@/pages/Quotations/QuotationDetail';
import { QuotationEditor } from '@/pages/Quotations/QuotationEditor';
import { QuotationSettings } from '@/pages/Quotations/QuotationSettings';
import { isQCRole } from '@/lib/quality';
import { QualityProvider } from '@/context/QualityContext';
import { QualityPage, QualityGuard, RoleDashboard } from '@/pages/Quality/QualityPage';
import { InspectionDetail } from '@/pages/Quality/InspectionDetail';
import { ModelsProvider } from '@/context/ModelsContext';
import { CostingProvider } from '@/context/CostingContext';
import { InvoicesProvider } from '@/context/InvoicesContext';
import { SalesOrderDetail } from '@/pages/SalesOrders/SalesOrderDetail';
import { SalesOrdersProvider } from '@/context/SalesOrdersContext';
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { SalesOrderList } from "@/pages/SalesOrders/SalesOrderList";
import { JobCardList } from "@/pages/JobCards/JobCardList";
import { JobCardDetail } from "@/pages/JobCards/JobCardDetail";
import { TrackTrace } from "@/pages/TrackTrace/ConnectedTrace";
import { StockPage } from "@/pages/Stocks/stocks";
import { RawMaterialPage } from "@/pages/RawMaterials/RawMaterialPage";
import { InventoryProvider } from "@/context/InventoryContext";
import { JobCardsProvider } from "@/context/JobCardsContext";
import { ItemRegisterPage } from "@/pages/Registers/ItemRegisterPage";
import { ConsumablesPage } from "@/pages/Consumables/ConsumablesPage";

import { RecyclingPage } from "@/pages/Recycling/RecyclingPage";
import { CostingPage } from "@/pages/Costing/CostingPage";
import { MastersPage } from "@/pages/Masters/MastersPage";
import { FinanceQualityOverview } from "@/pages/FinanceDashboard";
import { AccountingPage } from '@/pages/Accounting';
import { SalesLayout, SalesDashboard, SalesLedgerPage, SalesDocumentsPage } from '@/pages/Sales/SalesWorkspace';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading, sessionError, retrySession } = useAuth();
  const location = useLocation();
  if (loading) return <p role="status" className="p-8">Restoring your session…</p>;
  if (sessionError) return <div className="space-y-3 p-8"><p role="alert">{sessionError}</p><button className="rounded border px-4 py-2" onClick={retrySession}>Retry</button></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isQCRole(user.role) && location.pathname !== "/" && location.pathname !== "/sales" && location.pathname !== "/sales/returns" && !location.pathname.startsWith("/qc") && !location.pathname.startsWith("/job-cards")) return <Navigate to="/qc" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/finance/login" element={<Login key="finance" finance />} />

      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={user?.role === "accounts" ? <AccountingPage /> : <RoleDashboard operations={<Dashboard />} />} />
        <Route path="/finance" element={<AccountingPage />} />
        <Route path="/finance/quality" element={user?.role==="accounts"?<FinanceQualityOverview/>:<Navigate to="/" replace/>} />
        <Route path="/qc" element={<QualityGuard><QualityPage /></QualityGuard>} />
        <Route path="/qc/inspections/:id" element={<QualityGuard><InspectionDetail /></QualityGuard>} />
        <Route path="/qc/:section" element={<QualityGuard><QualityPage /></QualityGuard>} />
        <Route path="/quotations" element={<QuotationsGuard><QuotationList /></QuotationsGuard>} />
        <Route path="/quotations/settings" element={<QuotationsGuard><QuotationSettings /></QuotationsGuard>} />
        <Route path="/quotations/:id" element={<QuotationsGuard><QuotationDetail /></QuotationsGuard>} />
        <Route path="/quotations/:id/edit" element={<QuotationsGuard><QuotationEditor /></QuotationsGuard>} />
        <Route path="/sales-orders" element={<SalesOrderList />} />
        <Route path="/sales" element={<SalesLayout />}>
          <Route index element={<SalesDashboard />} />
          <Route path="ledger" element={<SalesLedgerPage />} />
          <Route path="returns" element={<SalesDocumentsPage key="returns" kind="return" />} />
          <Route path="credit-notes" element={<SalesDocumentsPage key="credits" kind="credit" />} />
        </Route>
        <Route path="/production-models" element={<ModelManager />} />
        <Route path="/production-processes" element={<ProcessManager />} />
        <Route path="/purchase-orders" element={<PurchaseOrders />} />
        <Route path="/goods-received-notes" element={<GoodsReceivedNotes />} />
        <Route path="/goods-received-notes/new" element={<GoodsReceivedNoteEditor />} />
        <Route path="/goods-received-notes/:id" element={<GoodsReceivedNoteDetail />} />
        <Route path="/purchase-orders/new" element={<PurchaseOrderEditor />} />
        <Route path="/purchase-orders/:id" element={<PurchaseOrderDetail />} />
        <Route path="/sales-orders/new" element={<SalesOrderList />} />
        <Route path="/sales-orders/:id" element={<SalesOrderDetail />} />
        <Route path="/job-cards" element={<JobCardList />} />
        <Route path="/job-cards/:id" element={<JobCardDetail />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/raw-materials" element={<RawMaterialPage />} />
        <Route path="/procurement" element={<ProcurementPlanner />} />
        <Route path="/spares" element={<ItemRegisterPage key="spares" kind="spares" />} />
        <Route path="/consumables" element={<ConsumablesPage />} />
        <Route path="/recycling" element={<RecyclingPage />} />
        <Route path="/costing" element={<CostingPage />} />
        <Route path="/masters" element={<MastersPage />} />
        <Route path="/activity-history" element={<ActivityHistory />} />
        <Route path="/track-trace" element={<TrackTrace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <SharedEntriesProvider>
      <SalesOrdersProvider><ModelsProvider><CommercialProvider><QualityProvider><InventoryProvider><CostingProvider><QuotationsProvider><JobCardsProvider><InvoicesProvider><AppRoutes /></InvoicesProvider></JobCardsProvider></QuotationsProvider></CostingProvider></InventoryProvider></QualityProvider></CommercialProvider></ModelsProvider></SalesOrdersProvider>
      </SharedEntriesProvider>
    </AuthProvider>
  );
}
