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
  LogOut,
  Bell,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/types";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
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
  { to: "/recycling", label: "Recycling", icon: Recycle, roles: ["recycling_operator", "admin"] },
  { to: "/costing", label: "Costing", icon: Calculator, roles: ["accounts", "admin"] },
  { to: "/track-trace", label: "Track & Trace", icon: Search, roles: ["receptionist", "production_manager", "store_keeper", "production_operator", "recycling_operator", "accounts", "admin"] },
  { to: "/masters", label: "Masters", icon: Settings, roles: ["admin"] },
];

const FINANCE_NAV_ITEMS: NavItem[] = [
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
  { label: "Finance & Tracking", routes: ["/costing", "/track-trace"] },
];

export function AppShell() {
  const pendingSaves = useSharedEntriesPending();
  const { user, logout } = useAuth();
  const items: NavItem[] = isQCRole(user?.role) ? [{ to: "/qc", label: "QC Dashboard", icon: LayoutDashboard, roles: QC_VIEW_ROLES }, ...QC_SECTIONS.map(([key, label]) => ({ to: `/qc/${key}`, label, icon: ClipboardList, roles: QC_VIEW_ROLES }))] : user?.role === "accounts" ? FINANCE_NAV_ITEMS : NAV_ITEMS.filter((item) => !user || item.roles.includes(user.role));
  const groups = isQCRole(user?.role)
    ? [{ label: "Quality Control", items }]
    : NAV_GROUPS.map(group => ({
      label: group.label,
      items: group.routes.flatMap(route => items.filter(item => item.to === route)),
    })).filter(group => group.items.length > 0);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_72%_0%,#2dbb4c_0%,#16803d_42%,#0b3c2a_100%)] p-3 sm:p-5">
      <div className="flex min-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[24px] bg-[#f5f8f5] shadow-2xl shadow-emerald-950/25 md:h-[calc(100dvh-2.5rem)] md:min-h-0 md:flex-row">
      <aside className="flex min-h-0 w-full shrink-0 flex-col bg-[#102d24] text-white md:w-[230px]">
        <div className="flex items-center gap-2 px-5 py-6">
          <img src="/assets/Nava-logo.png" alt="NavaPack" className="h-8 w-auto max-w-[155px] object-contain" />
        </div>

        <div className="mx-4 mb-5 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-white/45">Active workspace</p>
          <p className="mt-1 text-xs font-medium text-white/90">{user?.role==='accounts'?'NavaPack Finance':'NavaPack Operations'}</p>
        </div>

        <nav aria-label="Main navigation" className="sidebar-navigation min-h-0 max-h-[40dvh] flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 pb-4 md:max-h-none">
          {groups.map(group => (
            <section key={group.label} aria-label={group.label} className="space-y-1">
              <h2 className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">{group.label}</h2>
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
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">{user?.name?.slice(0, 1)}</div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white">{user?.name}</p>
              <p className="truncate text-[10px] capitalize text-white/45">{user?.role.replace("_", " ")}</p>
            </div>
          </div>
          <button
            disabled={pendingSaves}
            title={pendingSaves ? 'Finish or resolve pending database saves before signing out.' : undefined}
            onClick={logout}
            className="sidebar-sign-out mt-4 text-white/45 hover:text-white"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 bg-[#f5f8f5] md:overflow-y-auto">
        <div className="flex items-center justify-end gap-4 border-b border-[#e6eee8] px-5 py-4 sm:px-8">
          <button data-button-icon className="relative rounded-full p-2 text-[#668075] hover:bg-white" aria-label="Notifications"><Bell size={17} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#40bd5b]" /></button>
          <div className="h-7 w-px bg-[#dce8df]" />
          <span className="text-xs text-[#668075]">Operations overview</span>
        </div>
        <div className="p-5 sm:p-8"><Outlet /></div>
      </main>
      </div>
    </div>
  );
}
