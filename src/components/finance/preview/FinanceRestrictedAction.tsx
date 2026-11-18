export function FinanceRestrictedAction({ label }: { label: string }) {
  return <button type="button" disabled title={`${label} is unavailable in this frontend preview.`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-400 disabled:cursor-not-allowed">{label} · disabled</button>;
}
