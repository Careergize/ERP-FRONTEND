import { createDemoSnapshot } from './mockData';
import type { FinanceDashboardService } from './service';
export function createMockFinanceService(): FinanceDashboardService {
  return {
    mode: 'demo',
    async loadDashboard(signal) {
      signal?.throwIfAborted();
      const snapshot = createDemoSnapshot();
      await Promise.resolve();
      signal?.throwIfAborted();
      return snapshot;
    },
  };
}
