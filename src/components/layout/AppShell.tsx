import { AppShellFrame } from './AppShellFrame';
import { QC_VIEW_ROLES, isQCRole } from '@/lib/quality';
import { useSharedEntriesPending } from '@/context/SharedEntriesContext';
import { QC_SECTIONS } from '@/pages/Quality/QualityPage';
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Boxes,
  Package,
  Recycle,
  Calculator,
  Search,
  Settings,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/types";
import { SalesNavigation } from '@/pages/Sales/SalesNavigation';
import { useFinanceAccess } from '@/context/FinanceAccessContext';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { to: "/finance", label: "Finance & Accounting", icon: Calculator, roles: ["admin", "accounts", "project_manager", "production_manager"] },
  { to: "/activity-history", label: "Entry History", icon: ClipboardList, roles: ["admin", "project_manager", "production_manager", "accounts"] },
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["project_manager", "receptionist", "production_manager", "store_keeper", "production_operator", "recycling_operator", "accounts", "admin"] },
  { to: "/purchase-orders", label: "Purchase Orders", icon: FileText, roles: ["admin", "store_keeper", "project_manager", "production_manager", "accounts"] },
  { to: "/sales-orders", label: "Sales Orders", icon: FileText, roles: ["receptionist", "admin"] },
  { to: "/goods-received-notes", label: "Goods Received Notes", icon: ClipboardList, roles: ["admin", "store_keeper", "project_manager", "production_manager", "accounts"] },
  { to: "/production-models", label: "Product Models", icon: Settings, roles: ["admin", "receptionist", "production_manager"] },
  { to: "/production-processes", label: "Processes & Machines", icon: Settings, roles: ["admin", "receptionist", "production_manager"] },
  { to: "/procurement", label: "Procurement Planner", icon: ClipboardList, roles: ["admin", "store_keeper", "production_manager", "project_manager", "accounts"] },
  { to: "/quotations", label: "Quotations", icon: FileText, roles: ["project_manager", "receptionist", "accounts", "production_manager", "admin"] },
  { to: "/qc", label: "Quality Control", icon: ClipboardList, roles: QC_VIEW_ROLES },
  { to: "/job-cards", label: "Job Cards", icon: ClipboardList, roles: ["receptionist", "production_manager", "store_keeper", "production_operator", "admin"] },
  { to: "/stock", label: "Stock", icon: Boxes, roles: ["store_keeper", "admin"] },
  { to: "/raw-materials", label: "Raw Material", icon: Package, roles: ["store_keeper", "admin"] },
  { to: "/spares", label: "Spares", icon: Package, roles: ["store_keeper", "admin"] },
  { to: "/consumables", label: "Consumables", icon: Package, roles: ["store_keeper", "admin"] },
  { to: "/recycling", label: "Recycling", icon: Recycle, roles: ["recycling_operator", "store_keeper", "production_manager", "project_manager", "admin"] },
  { to: "/costing", label: "Costing", icon: Calculator, roles: ["accounts", "admin"] },
  { to: "/track-trace", label: "Track & Trace", icon: Search, roles: ["receptionist", "production_manager", "store_keeper", "production_operator", "recycling_operator", "accounts", "admin"] },
  { to: "/masters", label: "Masters", icon: Settings, roles: ["admin"] },
];

const FINANCE_NAV_ITEMS: NavItem[] = [
  { to: "/finance", label: "Finance & Accounting", icon: Calculator, roles: ["accounts"] },
  { to: "/activity-history", label: "Entry History", icon: ClipboardList, roles: ["accounts"] },
  { to: "/", label: "Finance Dashboard", icon: LayoutDashboard, roles: ["accounts"] },
  { to: "/purchase-orders", label: "Purchase Orders", icon: FileText, roles: ["accounts"] },
  { to: "/sales-orders", label: "Sales Orders", icon: FileText, roles: ["accounts"] },
  { to: "/goods-received-notes", label: "Goods Received Notes", icon: ClipboardList, roles: ["accounts"] },
  { to: "/procurement", label: "Procurement Planner", icon: ClipboardList, roles: ["accounts"] },
  { to: "/spares", label: "Spares", icon: Package, roles: ["accounts"] },
  { to: "/consumables", label: "Consumables", icon: Package, roles: ["accounts"] },
  { to: "/costing", label: "Costing", icon: Calculator, roles: ["accounts"] },
  { to: "/masters", label: "Masters", icon: Settings, roles: ["accounts"] },
  { to: "/finance/quality", label: "Quality summary", icon: ClipboardList, roles: ["accounts"] },
  { to: "/quotations", label: "Quotations", icon: FileText, roles: ["accounts"] },
  { to: "/raw-materials", label: "Raw Materials", icon: Package, roles: ["accounts"] },
  { to: "/recycling", label: "Recycling", icon: Recycle, roles: ["accounts"] },
  { to: "/stock", label: "Stocks", icon: Boxes, roles: ["accounts"] },
  { to: "/track-trace", label: "Track & Trace", icon: Search, roles: ["accounts"] },
];

const NAV_GROUPS = [
  { label: "Overview", routes: ["/", "/activity-history"] },
  { label: "Configuration", routes: ["/masters", "/production-models", "/production-processes"] },
  { label: "Sales", routes: ["/quotations", "/sales-orders"] },
  { label: "Procurement", routes: ["/procurement", "/purchase-orders", "/goods-received-notes"] },
  { label: "Production", routes: ["/job-cards", "/qc", "/finance/quality"] },
  { label: "Inventory", routes: ["/stock", "/raw-materials", "/spares", "/consumables", "/recycling"] },
  { label: "Finance & Tracking", routes: ["/finance", "/costing", "/track-trace"] },
];

export function AppShell() {
  const pendingSaves = useSharedEntriesPending();
  const { user, logout } = useAuth();
  const finance = useFinanceAccess();
  const items: NavItem[] = isQCRole(user?.role) ? [{ to: "/qc", label: "QC Dashboard", icon: LayoutDashboard, roles: QC_VIEW_ROLES }, ...QC_SECTIONS.map(([key, label]) => ({ to: `/qc/${key}`, label, icon: ClipboardList, roles: QC_VIEW_ROLES }))] : user?.role === "accounts" ? FINANCE_NAV_ITEMS : NAV_ITEMS.filter((item) => !user || item.roles.includes(user.role));
  const groups = isQCRole(user?.role)
    ? [{ label: "Quality Control", items }, { label: "Sales", items: [] }]
    : NAV_GROUPS.map(group => ({
      label: group.label,
      items: group.routes.flatMap(route => items.filter(item => item.to === route)),
    })).filter(group => group.items.length > 0);
  if (!finance.loading && !finance.error && finance.access?.entitled) {
    groups.push({ label: 'Finance & Accounts', items: [{ to: '/finance/erpnext', label: 'Finance & Accounts', icon: Calculator, roles: [] }] });
  }

  return <AppShellFrame
    navigation={<>          {groups.map(group => (
            <section key={group.label} aria-label={group.label} className="space-y-1">
              {group.label === 'Sales' ? <SalesNavigation role={user?.role} /> : <h2 className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">{group.label}</h2>}
          {group.items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/" || to === "/qc"}
              className={({ isActive }) =>
                `sidebar-nav-link transition-colors ${
                  isActive ? "bg-[#b7efbd] text-[#123b29]" : "text-white/65 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icon size={18} />
              <span className="min-w-0">{label}</span>
            </NavLink>
          ))}
            </section>
          ))}</>}
    workspaceLabel={user?.role === 'accounts' ? 'NavaPack Finance' : 'NavaPack Operations'}
    displayName={user?.name} roleLabel={user?.role.replace('_', ' ')}
    onExit={logout} pendingSaves={pendingSaves}
  ><Outlet /></AppShellFrame>;
}
