import type { ReactNode } from 'react';
export function FinancePageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#668075]">Finance &amp; Accounts</p><h1 className="text-2xl font-semibold text-[#123b29]">{title}</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">{description}</p></div>{actions}</header>;
}
