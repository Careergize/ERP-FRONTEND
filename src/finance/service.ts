import type { FinanceSnapshot } from './types';
// Read model boundary for future integration. No URLs or transport are implemented.
export interface FinanceDashboardService {
  readonly mode: 'demo';
  loadDashboard(signal?: AbortSignal): Promise<FinanceSnapshot>;
}
