import { Card } from '@/components/ui/Card';

export function FinanceSetupGuide({ connectivityVerified }: { connectivityVerified: boolean }) {
  if (!connectivityVerified) return null;
  return <Card><div className="space-y-3">
    <h2 className="font-semibold">Awaiting CA configuration and approval</h2>
    <p className="text-sm text-slate-600">Accounting setup has not been assessed. This status does not indicate whether accounting configuration exists or is complete.</p>
    <p className="text-sm text-slate-600">The client’s CA / Finance Manager owns company setup, accounts, fiscal years, taxes, opening balances, bank accounts and accounting policies.</p>
    <p className="text-sm text-slate-600">Future setup screens require explicit permissions and independent review. Approval and activation controls are not implemented. Financial posting remains disabled.</p>
  </div></Card>;
}
