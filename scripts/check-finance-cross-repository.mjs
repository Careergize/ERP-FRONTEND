import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { frontendRoot, verifyHashes } from './finance-preservation.mjs';

function argument(name) {
  const index = process.argv.indexOf(name);
  assert.ok(index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--'),
    `Required explicit argument: ${name}`);
  return resolve(process.argv[index + 1]);
}
const roots = { frontend: frontendRoot, backend: argument('--backend-root'), finance: argument('--finance-root') };
let count = 0;
for (const name of ['finance-preview-baseline.json', 'finance-batch3-preservation.json', 'fixtures/finance-gateway-baseline.json']) {
  const manifest = JSON.parse(readFileSync(new URL(name, import.meta.url)));
  count += verifyHashes(manifest.sha256 || manifest, roots);
}
const backendScript = readFileSync(resolve(roots.backend, 'scripts/Test-FinanceConnectivity.ps1'));
const financeScript = readFileSync(resolve(roots.finance, 'scripts/Test-FinanceConnectivity.ps1'));
assert.equal(createHash('sha256').update(backendScript).digest('hex'),
  createHash('sha256').update(financeScript).digest('hex'), 'Diagnostic script copies must remain identical');
console.log(`PASS: ${count} explicitly configured cross-repository hashes and diagnostic script parity.`);
