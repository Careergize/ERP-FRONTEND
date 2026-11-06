import { renameSync } from 'node:fs';
// Vite retains the dedicated input name. The isolated deployment needs index.html
// for SPA deep links; this changes generated output only, never operational index.
renameSync(new URL('../dist-finance-demo/finance-demo.html', import.meta.url),
  new URL('../dist-finance-demo/index.html', import.meta.url));
