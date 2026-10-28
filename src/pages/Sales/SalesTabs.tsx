import { NavLink } from 'react-router-dom';
import { SALES_LINKS, SALES_QC_ROLES } from '@/lib/salesManagement';
import type { Role } from '@/types';
import type { MouseEvent } from 'react';

export function guardSalesTabChange(event:MouseEvent<HTMLAnchorElement>) {
  if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.currentTarget.getAttribute('aria-current')==='page')return;
  if(document.querySelector('.sales-dialog[open] form, .sales-dialog[open] textarea')&&!window.confirm('Switch tabs and close the current Sales dialog? Unsaved form entries will be lost. Save the draft first or cancel to keep editing.'))event.preventDefault();
}

export function SalesTabs({role}:{role?:Role}) {
  return <nav aria-label="Sales sections" className="overflow-x-auto border-b border-emerald-200 pb-2">
    <div className="flex w-max min-w-full gap-2">{SALES_LINKS.filter(([to])=>!role||!SALES_QC_ROLES.includes(role)||to==='/sales/returns').map(([to,label])=><NavLink key={to} to={to} end={to==='/sales'}
      onClick={guardSalesTabChange}
      className={({isActive})=>`whitespace-nowrap rounded-t-lg px-4 py-3 text-sm font-medium transition-colors ${isActive?'bg-emerald-700 text-white':'bg-white text-emerald-900 hover:bg-emerald-50'}`}>{label}</NavLink>)}</div>
  </nav>;
}
