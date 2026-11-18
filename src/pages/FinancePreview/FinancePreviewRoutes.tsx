import { useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { FinanceDemoProvider } from '@/finance/FinanceDemoContext';
import { FinancePreviewGate } from '@/components/finance/preview/FinancePreviewGate';
import { FinancePreviewLayout } from '@/components/finance/preview/FinancePreviewLayout';
import { AccountingSetupPage, FinancialMastersPage } from './FinancialMastersPage';
import { transactionKinds } from '@/finance/transactionData';
import { FinanceTransactionsPage } from './FinanceTransactionsPage';
import { reportPages, type ReportPage } from '@/finance/reportData';
import { FinanceReportsPage } from './FinanceReportsPage';
import { administrationPages, type AdministrationPage } from '@/finance/administrationData';
import { FinanceAdministrationPage } from './FinanceAdministrationPage';
import { DashboardPage } from './DashboardPage';
export default function FinancePreviewRoutes() {
  const [entered, setEntered] = useState(false);
  const navigate = useNavigate();
  if (!entered) return <FinancePreviewGate onEnter={() => { setEntered(true); navigate('/finance/preview/dashboard', { replace: true }); }} />;
  return <FinanceDemoProvider><Routes><Route element={<FinancePreviewLayout onExit={() => { setEntered(false); navigate('/finance/preview', { replace: true }); }} />}>
    <Route path="/finance/preview" element={<Navigate to="/finance/preview/dashboard" replace />} />
    <Route path="/finance/preview/dashboard" element={<DashboardPage />} />
    <Route path="/finance/preview/setup" element={<AccountingSetupPage />} />
    {(['accounts', 'taxes', 'parties', 'banks'] as const).map(kind => <Route key={kind} path={`/finance/preview/${kind}`} element={<FinancialMastersPage key={kind} kind={kind} />} />)}
    {transactionKinds.map(kind => <Route key={kind} path={`/finance/preview/${kind}`} element={<FinanceTransactionsPage key={kind} kind={kind} />} />)}
    {(Object.keys(reportPages) as ReportPage[]).map(page => <Route key={page} path={`/finance/preview/${page}`} element={<FinanceReportsPage key={page} page={page} />} />)}
    {(Object.keys(administrationPages) as AdministrationPage[]).map(page => <Route key={page} path={`/finance/preview/${page}`} element={<FinanceAdministrationPage key={page} page={page} />} />)}
    <Route path="*" element={<section><h1 className="text-xl font-semibold">Preview page unavailable</h1><p className="mt-3 text-sm">This module is outside the approved preview batches.</p><Link className="mt-4 inline-block underline" to="/finance/preview/dashboard">Return to Finance Dashboard</Link></section>} />
  </Route></Routes></FinanceDemoProvider>;
}
