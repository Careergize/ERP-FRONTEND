// Run after npm run build. Verify emitted CSS, not only plugin configuration.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const root = fileURLToPath(new URL('../', import.meta.url));
const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
const assets = [...html.matchAll(/href="([^"]+\.css)"/g)].map(match => match[1]);
assert.ok(assets.length, 'Built HTML must link its CSS');
const css = assets.map(asset => fs.readFileSync(path.join(root, 'dist', asset), 'utf8')).join('\n');
const ast = postcss.parse(css);
const rules = [];
ast.walkRules(rule => rules.push(rule));
const declarations = selector => Object.fromEntries(rules.filter(rule => rule.selector === selector)
  .flatMap(rule => rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value])));

assert.equal(declarations('.flex').display, 'flex');
assert.equal(declarations('.bg-navy')['background-color'], '#1a3764');
assert.equal(declarations('.text-ink').color, '#3d3d3c');
assert.equal(declarations('.rounded-card')['border-radius'], '8px');
const responsive = rules.find(rule => rule.selector === '.md\\:grid-cols-2');
assert.ok(responsive, 'Source scanning must emit the responsive grid utility');
assert.equal(responsive.parent.name, 'media');
assert.equal(declarations('.md\\:grid-cols-2')['grid-template-columns'], 'repeat(2,minmax(0,1fr))');
assert.equal(declarations('body').color, '#3d3d3c', 'Custom theme must resolve in @apply');
assert.equal(declarations('body')['-webkit-font-smoothing'], 'antialiased');
assert.equal(declarations(':focus-visible').outline, '2px solid #2e7db5');
assert.equal(declarations('.quotation-grid th,.quotation-grid td').border, '1px solid #000');

const atRules = [];
ast.walkAtRules(rule => atRules.push(rule));
for (const name of ['weave', 'orbit', 'pulse-point', 'rise-in', 'shake-once']) {
  assert.ok(atRules.some(rule => rule.name === 'keyframes' && rule.params === name), `Missing app animation ${name}`);
}
assert.ok(atRules.some(rule => rule.name === 'media' && rule.params.includes('prefers-reduced-motion')));
assert.ok(atRules.some(rule => rule.name === 'page' && rule.params === 'quotation'));
for (const subject of ['customer-estimate', 'qc-report', 'quotation-sheet']) {
  assert.ok(rules.some(rule => rule.selector.includes(subject) && rule.parent.name === 'media' && rule.parent.params === 'print'),
    `Missing ${subject} print rules`);
}
assert.ok(!atRules.some(rule => ['tailwind', 'apply', 'config'].includes(rule.name)), 'Tailwind directives must be processed');
console.log('PASS: built HTML links CSS; core/responsive/theme utilities and body @apply resolved.');
console.log('PASS: focus, app animations, reduced motion and estimate/QC/quotation print rules retained.');
console.log('CSS processing checks only; no browser visual regression claim.');
