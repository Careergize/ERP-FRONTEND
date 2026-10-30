import { Card } from '@/components/ui/Card';

type Row = Record<string, unknown>;
type Props = {
  report: { currency: string; transactions: Row[]; cashBank: Row[]; partyBalances: Row[]; trialBalance: Row[];
    cashFlow: Record<string,string>; cashFlowDetails?: Row[];
    profitLoss: { income: string; expenses: string; netProfit: string; accounts: Row[] };
    balanceSheet: { assets: string; liabilities: string; equity: string; retainedEarnings: string } };
  start: string; end: string; onReport: (name: string) => void; onAccount: (code: string) => void;
};
const money = (value: unknown) => Number(value ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});

export function trendRows(transactions: Row[], kind: string) {
  const months = new Map<string, number>();
  for (const row of transactions) {
    if (row.kind !== kind) continue;
    const month = String(row.date).slice(0,7);
    months.set(month, (months.get(month) ?? 0) + Number(row.baseNet ?? 0));
  }
  return [...months].sort(([a],[b]) => a.localeCompare(b)).map(([month,total]) => ({month,total}));
}
function Trend({title, rows, currency, onOpen}: {title: string; rows: {month:string;total:number}[];currency:string;onOpen:()=>void}) {
  const max = Math.max(1,...rows.map(r => Math.abs(r.total)));
  return <Card className="finance-trend"><button className="finance-tile-link" onClick={onOpen}>{title} →</button><p className="mt-1 text-xs text-gray-500">Net of tax · {currency} · includes dated reversals</p>
    {!rows.length ? <p className="py-10 text-center text-sm text-gray-500">No posted activity in this period.</p> : <div className="mt-4 max-h-64 space-y-3 overflow-auto" role="img" aria-label={`${title}: ${rows.map(r=>`${r.month} ${money(r.total)}`).join('; ')}`}>
      {rows.map(row => <div key={row.month} className="grid grid-cols-3 items-center gap-2 text-xs"><span>{row.month}</span><div className="finance-trend-bar"><div className={'h-4 rounded '+(row.total < 0 ? 'bg-orange-400' : 'bg-blue-500')} style={{width:`${Math.abs(row.total)/max*100}%`}} /></div><span className="text-right tabular-nums">{money(row.total)}</span></div>)}
    </div>}
  </Card>;
}
function Tile({title, rows, currency, onOpen, note}: {title:string;rows:[string,unknown][];currency:string;onOpen:()=>void;note?:string}) {
  return <Card><button className="finance-tile-link" onClick={onOpen}>{title} →</button><dl className="mt-4 space-y-3 text-sm">{rows.map(([name,value])=><div key={name} className="flex justify-between gap-4"><dt className="text-gray-600">{name}</dt><dd className="text-right font-medium tabular-nums">{value == null ? 'Not available' : `${money(value)} ${currency}`}</dd></div>)}</dl>{note&&<p className="mt-4 text-xs text-gray-500">{note}</p>}</Card>;
}
export function FinanceAnalysisHome({report, start, end, onReport, onAccount}: Props) {
  const details = report.cashFlowDetails;
  const inflow = details?.reduce((sum,r)=>sum+Number(r.inflows),0);
  const outflow = details?.reduce((sum,r)=>sum+Number(r.outflows),0);
  const balance = (code:string) => Number(report.trialBalance.find(r=>r.code===code)?.balance ?? 0);
  const accounts = [...report.cashBank].sort((a,b)=>Number(b.closing)-Number(a.closing));
  return <div className="space-y-5"><div className="finance-section-heading"><div><span className="finance-eyebrow">FINANCIAL OVERVIEW</span><h2>Analysis home</h2><p>{start} to {end} · Company-wide posted accounts</p></div></div>
    <div className="finance-metrics">{[
      ['Total income',report.profitLoss.income,'Profit & Loss'],
      ['Net profit / loss',report.profitLoss.netProfit,'Profit & Loss'],
      ['Cash & bank balance',report.cashBank.reduce((sum,r)=>sum+Number(r.closing),0),'Cash & Bank'],
      ['Customer receivables',balance('1300'),'Customer Ledger']
    ].map(([label,value,destination])=><div className="finance-metric" key={String(label)}><span>{label}</span><strong>{money(value)}</strong><small>{report.currency} · {String(label).includes('balance')||String(label).includes('receivables')?'Closing balance':'Selected period'}</small><button className="finance-tile-link mt-3" aria-label={'View '+label} onClick={()=>onReport(String(destination))}>View report ↗</button></div>)}</div>
    <div className="grid items-start gap-4 lg:grid-cols-3">
      <div className="space-y-4"><Trend title="Sales trend" rows={trendRows(report.transactions,'invoice')} currency={report.currency} onOpen={()=>onReport('Sales Report')}/>
        <Tile title="Trading details" currency={report.currency} onOpen={()=>onReport('Profit & Loss')} rows={[
          ['Income',report.profitLoss.income],['Expenses including cost of sales',report.profitLoss.expenses],['Net profit / loss',report.profitLoss.netProfit]
        ]} note="Gross profit requires an approved split of direct costs and overheads."/>
        <Tile title="Cash / bank accounts" currency={report.currency} onOpen={()=>onReport('Cash & Bank')} rows={report.cashBank.map(r=>[String(r.name),r.closing])} note={!report.cashBank.length?'No cash, bank or mobile-money accounts returned.': 'Closing balances as of the selected end date.'}/>
      </div>
      <div className="space-y-4"><Trend title="Purchase trend" rows={trendRows(report.transactions,'bill')} currency={report.currency} onOpen={()=>onReport('Purchase Report')}/>
        <Tile title="Assets / liabilities" currency={report.currency} onOpen={()=>onReport('Balance Sheet')} rows={[
          ['Total assets',report.balanceSheet.assets],['Total liabilities',report.balanceSheet.liabilities],['Equity and accumulated earnings',Number(report.balanceSheet.equity)+Number(report.balanceSheet.retainedEarnings)]
        ]} note="As of the selected end date."/>
        <Card><h3 className="text-lg font-semibold text-navy">Top accounts / ledgers</h3><p className="mt-1 text-xs text-gray-500">Cash, bank and mobile money · ranked by closing balance</p><div className="mt-4 space-y-3">{accounts.slice(0,5).map(r=><button key={String(r.code)} className="finance-account-link" onClick={()=>onAccount(String(r.code))}><span>{String(r.name)}</span><span className="tabular-nums">{money(r.closing)} {report.currency}</span></button>)}{!accounts.length&&<p className="text-sm text-gray-500">No account balances available.</p>}</div></Card>
      </div>
      <div className="space-y-4"><Tile title="Cash in / out flow" currency={report.currency} onOpen={()=>onReport('Cash Flow')} rows={[
        ['Net flow',Object.values(report.cashFlow).reduce((sum,v)=>sum+Number(v),0)],['Inflow',inflow],['Outflow',outflow]
      ]} note="Selected-period external cash movements; opening balances and internal transfers excluded."/>
        <Tile title="Receivables / payables" currency={report.currency} onOpen={()=>onReport('Customer Ledger')} rows={[
          ['Net customer receivables',balance('1300')],['Net supplier payables',-balance('2100')]
        ]} note="Closing control-account balances, including advances. Overdue balances need invoice due dates and are not yet available."/>
        <Card><h3 className="text-lg font-semibold text-navy">Accounting ratios</h3><p className="mt-3 text-sm text-gray-600">Inventory turnover, collection days and return on investment require agreed average-balance and cost classifications.</p><p className="mt-3 text-xs text-gray-500">These ratios will appear once their required accounting inputs are available.</p></Card>
      </div>
    </div>
  </div>;
}
