export type DemoId = `DEMO-${string}`;
export type TransactionStatus = 'Draft' | 'Submitted' | 'Cancelled' | 'Reference snapshot';
export type TransactionKind = 'Sales invoice' | 'Purchase invoice' | 'Receipt' | 'Payment' | 'Journal';
// This fixture currency has zero decimal places; all amounts are whole UGX.
export type DemoMoney = number;
export interface FinanceTransaction {
  id: DemoId; date: string; party: string; description: string;
  kind: TransactionKind; status: TransactionStatus; amount: DemoMoney;
}
export interface FinanceMonth { id: string; label: string; revenue: DemoMoney; expense: DemoMoney }
export interface OutstandingItem { id: DemoId; name: string; amount: DemoMoney; overdue: DemoMoney }
export interface FinanceSnapshot {
  source: 'demo'; company: string; currency: 'UGX'; asOf: string;
  months: FinanceMonth[]; transactions: FinanceTransaction[];
  receivables: OutstandingItem[]; payables: OutstandingItem[];
  cashAccounts: { id: DemoId; name: string; amount: DemoMoney }[];
}
export type DemoViewState = 'ready' | 'loading' | 'empty' | 'error';
export const formatMoney = (amount: DemoMoney, currency: string) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
export const sumAmounts = (rows: readonly { amount: DemoMoney }[]) => rows.reduce((total, row) => total + row.amount, 0);
