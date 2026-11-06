import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, relative, isAbsolute } from 'node:path';

export const frontendRoot = fileURLToPath(new URL('../', import.meta.url));
export function verifyHashes(hashes, roots) {
  let checked = 0;
  for (const [path, hash] of Object.entries(hashes)) {
    const slash = path.indexOf('/');
    const owner = path.slice(0, slash), local = path.slice(slash + 1);
    assert.ok(['frontend', 'backend', 'finance'].includes(owner), `Unknown owner: ${path}`);
    if (!roots[owner]) continue; // Unit scope is explicit; integration checks other owners.
    const target = resolve(roots[owner], local), within = relative(resolve(roots[owner]), target);
    assert.ok(within && !within.startsWith('..') && !isAbsolute(within), `Unsafe path: ${path}`);
    assert.equal(createHash('sha256').update(readFileSync(target)).digest('hex'), hash, `Preserve ${path}`);
    checked++;
  }
  assert.ok(checked > 0, 'Preservation scope must not be empty');
  return checked;
}
export function verifyFrontend(hashes) {
  const count = verifyHashes(hashes, { frontend: frontendRoot });
  console.log(`PASS: ${count} frontend preservation hashes; external owners checked by explicit integration command.`);
}
