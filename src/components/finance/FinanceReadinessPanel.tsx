import { Card } from '@/components/ui/Card';
import type { FinanceStatus } from '@/lib/financeGateway';

export type FinanceReadinessPanelProps = {
  status: FinanceStatus | null;
  busy: boolean;
  error: string;
  onCheck: () => void;
};

const messages: Record<FinanceStatus['connection'], string> = {
  authenticated: 'The expected integration identity responded. This does not verify accounting permissions or configuration.',
  not_configured: 'The server connection is not configured.',
  permission_denied: 'The accounting service denied the integration connection.',
  unavailable: 'The accounting service is unavailable.',
  timeout: 'The accounting service did not respond in time.',
  invalid_response: 'The accounting service returned an unexpected response.',
};

export function FinanceReadinessPanel({ status, busy, error, onCheck }: FinanceReadinessPanelProps) {
  const title = busy ? 'Checking connection…' : error ? 'Connection unavailable'
    : !status ? 'Connection not checked'
    : status.connection === 'authenticated' ? 'Connection authenticated'
    : status.connection === 'not_configured' ? 'Connection not configured' : 'Connection unavailable';
  return <Card><div className="space-y-3">
    <h2 className="font-semibold">{title}</h2>
    <p className="text-sm text-slate-600">Finance unavailable. Financial posting is disabled.</p>
    <p className="text-sm text-slate-600">Existing Finance &amp; Accounting workflows remain unchanged.</p>
    <button className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50" disabled={busy} onClick={onCheck}>{busy ? 'Checking connection…' : 'Check connection status'}</button>
    {busy ? <p role="status" className="text-sm">Checking the server connection…</p>
      : error ? <p role="alert" className="text-sm">{error}</p>
      : status && <p role="status" className="text-sm">{messages[status.connection]}</p>}
  </div></Card>;
}
