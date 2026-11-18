import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Landmark, TrendingUp, Wallet, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useFinanceDemo } from '@/finance/FinanceDemoContext';
import { demoPeriods } from '@/finance/mockData';
import { financePreviewSections, futureFinanceModules } from '@/finance/navigation';
import { formatMoney, sumAmounts, type FinanceTransaction } from '@/finance/types';
import { FinancePageHeader } from '@/components/finance/preview/FinancePageHeader';
import { FinanceKpiCard } from '@/components/finance/preview/FinanceKpiCard';
import { FinanceChart } from '@/components/finance/preview/FinanceChart';
import { FinanceDataTable } from '@/components/finance/preview/FinanceDataTable';
import { FinanceFilters } from '@/components/finance/preview/FinanceFilters';
import { FinanceStatusBadge } from '@/components/finance/preview/FinanceStatusBadge';
import { FinanceRestrictedAction } from '@/components/finance/preview/FinanceRestrictedAction';
import { FinanceDetailDrawer } from '@/components/finance/preview/FinanceDetailDrawer';
import { FinanceViewState } from '@/components/finance/preview/FinanceViewState';

export function DashboardPage() {
  const { snapshot, state, reset } = useFinanceDemo();
  const [period, setPeriod] = useState('six');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<FinanceTransaction | null>(null);
  if (state !== 'ready' || !snapshot) return <FinanceViewState state={state === 'ready' ? 'loading' : state} retry={reset} />;
  const asOf = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${snapshot.asOf}T00:00:00Z`));
  const money = (amount: number) => formatMoney(amount, snapshot.currency);
  const selection = demoPeriods.find(p => p.id === period) ?? demoPeriods[0];
  const months = snapshot.months.slice(-selection.monthCount);
  const revenue = months.reduce((sum, month) => sum + month.revenue, 0);
  const expense = months.reduce((sum, month) => sum + month.expense, 0);
  const receivables = sumAmounts(snapshot.receivables), payables = sumAmounts(snapshot.payables);
  const filtered = snapshot.transactions.filter(row => (status === 'All statuses' || row.status === status) && `${row.id} ${row.party} ${row.description} ${row.kind}`.toLowerCase().includes(query.toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(filtered.length / 5));
  const currentPage = Math.min(page, pageCount - 1);
  return <div className="space-y-6">
    <section id="overview" className="scroll-mt-6"><FinancePageHeader title="Finance Dashboard" description={`${snapshot.company} · Fictional accounting overview for client and CA review.`} actions={<span className="rounded-full border border-[#dce8df] bg-white px-3 py-2 text-xs text-[#668075]">Demo snapshot · {asOf}</span>} /></section>
    <nav aria-label="Dashboard sections" className="flex flex-wrap gap-2">{financePreviewSections.map(section => <a key={section.id} href={`#${section.id}`} className="rounded-lg border border-[#dce8df] bg-white px-3 py-2 text-xs text-[#123b29]">{section.label}</a>)}</nav>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-medium text-[#123b29]">Performance overview <span className="ml-2 text-xs font-normal text-slate-500">Illustrative UGX · report-aligned</span></p><label className="flex flex-wrap items-center gap-2 text-xs text-slate-600">Performance period<select value={period} onChange={e => setPeriod(e.target.value)} className="max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">{demoPeriods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><FinanceKpiCard label="Revenue" value={money(revenue)} caption={selection.label} icon={TrendingUp} /><FinanceKpiCard label="Expenses" value={money(expense)} caption={selection.label} icon={ArrowUpRight} /><FinanceKpiCard label="Operating surplus" value={money(revenue - expense)} caption="Revenue less cost of sales and operating expenses" icon={Wallet} /><FinanceKpiCard label="Cash & bank" value={money(sumAmounts(snapshot.cashAccounts))} caption={`Snapshot at ${asOf}`} icon={Landmark} /></div>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <section id="trend" className="min-w-0 scroll-mt-6"><Card><div className="mb-5"><h2 className="font-semibold text-[#123b29]">Revenue &amp; expenses</h2><p className="mt-1 text-xs text-slate-500">{selection.label} · Demo Data</p></div><FinanceChart months={months} currency={snapshot.currency} /></Card></section>
      <Card><h2 className="font-semibold text-[#123b29]">Cash position</h2><p className="mt-1 text-xs text-slate-500">{asOf} · Demo Data</p><div className="mt-5 space-y-5">{snapshot.cashAccounts.map(account => <div key={account.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-4"><span className="text-sm text-slate-600">{account.name}</span><span className="text-sm font-semibold tabular-nums text-[#123b29]">{money(account.amount)}</span></div>)}</div><p className="mt-5 text-xs leading-5 text-slate-500">Fictional report-ledger balance as of the snapshot date. No bank connection; editable drafts are excluded.</p></Card>
    </div>
    <section id="outstanding" className="scroll-mt-6"><div className="mb-3 flex flex-wrap justify-between gap-2"><h2 className="font-semibold text-[#123b29]">Receivables &amp; payables</h2><span className="text-xs text-slate-500">{asOf} · Demo Data</span></div><div className="grid gap-5 lg:grid-cols-2">{([{ title: 'Receivables', rows: snapshot.receivables, total: receivables, icon: ArrowDownLeft }, { title: 'Payables', rows: snapshot.payables, total: payables, icon: ArrowUpRight }]).map(({ title, rows, total, icon: Icon }) => <Card key={title}><div className="flex items-center justify-between"><h3 className="text-sm font-medium text-slate-600">{title}</h3><Icon size={18} className="text-[#668075]" aria-hidden="true" /></div><p className="mt-3 text-2xl font-semibold text-[#123b29]">{money(total)}</p><p className="mt-1 text-xs text-amber-700">Overdue: {money(rows.reduce((sum, row) => sum + row.overdue, 0))}</p><ul className="mt-5 space-y-3">{rows.map(row => <li key={row.id} className="flex flex-wrap justify-between gap-2 text-sm"><span className="text-slate-500">{row.name}</span><span className="tabular-nums">{money(row.amount)}</span></li>)}</ul></Card>)}</div></section>
    <section id="transactions" className="min-w-0 scroll-mt-6"><Card><div className="mb-4 flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold text-[#123b29]">Recent transactions</h2><p className="mt-1 text-xs text-slate-500">Recent read-only report references, not a complete ledger · Demo Data</p></div><span className="text-xs text-slate-500">{filtered.length} fictional records</span></div><FinanceFilters query={query} status={status} onQuery={value => { setQuery(value); setPage(0); }} onStatus={value => { setStatus(value); setPage(0); }} /><FinanceDataTable rows={filtered.slice(currentPage * 5, currentPage * 5 + 5)} rowKey={row => row.id} caption="Recent fictional Finance transactions" columns={[
      { key: 'reference', title: 'Reference', render: row => <button className="whitespace-nowrap font-medium text-[#16803d] underline underline-offset-4" onClick={() => setDetail(row)} aria-label={`View ${row.id}`}>{row.id}</button> },
      { key: 'date', title: 'Date', render: row => <span className="whitespace-nowrap">{row.date}</span> },
      { key: 'party', title: 'Party / description', render: row => <div className="min-w-[180px]"><p>{row.party}</p><p className="mt-1 text-xs text-slate-400">{row.description}</p></div> },
      { key: 'kind', title: 'Type', render: row => <span className="whitespace-nowrap">{row.kind}</span> },
      { key: 'status', title: 'Demo status', render: row => <FinanceStatusBadge status={row.status} /> },
      { key: 'amount', title: `Amount (${snapshot.currency})`, numeric: true, render: row => <span className="whitespace-nowrap">{money(row.amount)}</span> },
    ]} /><div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500"><p aria-live="polite">Page {currentPage + 1} of {pageCount}</p><div className="flex gap-2"><button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button><button disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button></div></div></Card></section>
    {futureFinanceModules.length > 0 && <section className="border-t border-[#dce8df] pt-5"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-semibold text-[#123b29]">Next in Finance &amp; Accounts</h2><span className="text-xs text-slate-500">Planned modules · not implemented in Batch 1</span></div><div className="mt-3 grid gap-x-5 sm:grid-cols-2 xl:grid-cols-3">{futureFinanceModules.map(label => <div key={label} className="flex items-center justify-between gap-2 border-b border-[#e6eee8] py-3 text-xs text-slate-500"><span>{label}</span><ChevronRight size={14} aria-hidden="true" /></div>)}</div></section>}
    <section className="rounded-lg border border-[#dce8df] bg-white p-4"><h2 className="text-sm font-medium text-[#123b29]">Preview restrictions</h2><p className="mt-2 text-xs leading-5 text-slate-500">Finance availability and financial posting remain disabled. Demo statuses do not represent real submissions or CA approval.</p><div className="mt-3 flex flex-wrap gap-2">{['Post transaction', 'Approve', 'Activate Finance', 'Send email', 'Financial export'].map(label => <FinanceRestrictedAction key={label} label={label} />)}</div></section>
    {detail && <FinanceDetailDrawer title={detail.id} onDismiss={() => setDetail(null)}><dl className="space-y-4">{[['Date', detail.date], ['Type', detail.kind], ['Party', detail.party], ['Description', detail.description], ['Demo status', detail.status], ['Amount', money(detail.amount)]].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-sm">{value}</dd></div>)}</dl><p className="mt-6 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Fictional record only. This view cannot post, approve, edit or email a financial document.</p></FinanceDetailDrawer>}
  </div>;
}
