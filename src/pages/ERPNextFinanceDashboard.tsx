import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { FinanceReadinessPanel } from '@/components/finance/FinanceReadinessPanel';
import { FinanceSetupGuide } from '@/components/finance/FinanceSetupGuide';
import { loadFinanceStatus, type FinanceStatus } from '@/lib/financeGateway';

export function ERPNextFinanceDashboard() {
  const [status, setStatus] = useState<FinanceStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  async function checkStatus() {
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    setBusy(true); setStatus(null); setError('');
    try {
      const status = await loadFinanceStatus(controller.signal);
      if (!controller.signal.aborted) setStatus(status);
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(axios.isAxiosError(error) && error.response?.status === 403
          ? 'You do not have permission to inspect the Finance connection.'
          : 'Unable to check the Finance connection. Try again later.');
      }
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <section className="space-y-5">
    <div><h1 className="text-2xl font-semibold text-[#123b29]">Finance &amp; Accounts</h1><p className="mt-2 text-sm text-slate-600">Accounting integration</p></div>
    <FinanceReadinessPanel status={status} busy={busy} error={error} onCheck={() => void checkStatus()} />
    <FinanceSetupGuide connectivityVerified={!busy && !error && status?.connection === 'authenticated'} />
  </section>;
}
