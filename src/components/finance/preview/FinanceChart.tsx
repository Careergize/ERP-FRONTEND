import { useId } from 'react';
import type { FinanceMonth } from '@/finance/types';
import { formatMoney } from '@/finance/types';
export function FinanceChart({ months, currency }: { months: FinanceMonth[]; currency: string }) {
  const id = useId();
  const maximum = Math.max(1, ...months.flatMap(m => [m.revenue, m.expense]));
  const unit = maximum >= 1000000 ? 1000000 : 1;
  const stepSize = 10 ** Math.floor(Math.log10(maximum));
  const ceiling = Math.ceil(maximum / stepSize) * stepSize;
  const units = unit === 1 ? 'whole units' : 'millions';
  return <figure aria-labelledby={`${id}-caption`}>
    <figcaption id={`${id}-caption`} className="sr-only">Monthly revenue and expenses, Demo Data. Horizontal axis: month and year. Vertical axis: {currency} {units}.</figcaption>
    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600"><span><span className="mr-2 inline-block h-2 w-2 rounded-sm bg-[#16803d]" />Revenue</span><span><span className="mr-2 inline-block h-2 w-2 rounded-sm bg-[#b7cfbf]" />Expenses</span><span className="ml-auto">{currency}, {units}</span></div>
    <svg viewBox="0 0 620 255" role="img" aria-labelledby={`${id}-title`} className="mt-4 block w-full"><title id={`${id}-title`}>Revenue and expenses by month, fictional demonstration</title>
      {[0, 1, 2, 3, 4].map(step => { const y = 210 - step * 45; return <g key={step}><line x1="44" y1={y} x2="610" y2={y} stroke="#e6eee8" /><text x="35" y={y + 4} textAnchor="end" fill="#668075" fontSize="11">{(ceiling * step / 4 / unit).toLocaleString('en-GB', { maximumFractionDigits: 1 })}</text></g>; })}
      {months.map((month, i) => { const slot = 550 / months.length; const x = 52 + i * slot; const width = Math.min(27, slot / 3); return <g key={month.id}><rect x={x + slot / 2 - width - 2} y={210 - month.revenue / ceiling * 180} width={width} height={month.revenue / ceiling * 180} rx="3" fill="#16803d" /><rect x={x + slot / 2 + 2} y={210 - month.expense / ceiling * 180} width={width} height={month.expense / ceiling * 180} rx="3" fill="#b7cfbf" /><text x={x + slot / 2} y="233" textAnchor="middle" fill="#668075" fontSize="12">{month.label}</text></g>; })}
    </svg>
    <details className="mt-2 text-xs text-slate-500"><summary className="cursor-pointer">View chart values · Demo Data</summary><table className="mt-3 w-full text-left"><caption className="sr-only">Monthly revenue and expense amounts in {currency}</caption><thead><tr><th scope="col">Month</th><th scope="col">Revenue</th><th scope="col">Expenses</th></tr></thead><tbody>{months.map(m => <tr key={m.id}><th scope="row" className="py-1 font-normal">{m.label} {m.id.slice(0, 4)}</th><td>{formatMoney(m.revenue, currency)}</td><td>{formatMoney(m.expense, currency)}</td></tr>)}</tbody></table></details>
    <p className="mt-3 text-xs text-slate-400">Source: reconciled fictional report ledger · {months[0]?.id}–{months.at(-1)?.id} · Demo Data</p>
  </figure>;
}
