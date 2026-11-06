import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
export function FinanceKpiCard({ label, value, caption, icon: Icon }: { label: string; value: string; caption: string; icon: LucideIcon }) {
  return <Card><div className="flex items-center justify-between gap-2"><h2 className="text-sm text-slate-600">{label}</h2><Icon size={18} className="shrink-0 text-[#668075]" aria-hidden="true" /></div><p className="mt-4 break-words text-2xl font-semibold tracking-tight text-[#123b29]">{value}</p><p className="mt-2 text-xs text-slate-500">{caption}</p><span className="mt-4 inline-block text-[10px] font-semibold uppercase tracking-wider text-[#668075]">Demo Data</span></Card>;
}
