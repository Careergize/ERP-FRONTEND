import { ShoppingCart } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { SALES_VIEW_ROLES } from '@/lib/salesManagement';
import type { Role } from '@/types';
export function SalesNavigation({role}:{role?:Role}) {
  if(!role||!SALES_VIEW_ROLES.includes(role))return null;
  return <NavLink to="/sales" className={({isActive})=>`sidebar-nav-link transition-colors ${isActive?'bg-[#b7efbd] text-[#123b29]':'text-white/65 hover:bg-white/10 hover:text-white'}`}><ShoppingCart size={18} aria-hidden="true"/>Sales</NavLink>;
}
