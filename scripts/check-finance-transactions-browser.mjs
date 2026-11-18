import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
export async function checkTransactionBrowser({ evaluate, wait, cdp, evidence }) {
  const click = text => evaluate(`[...document.querySelectorAll('button,a')].find(b=>b.textContent===${JSON.stringify(text)}).click()`);
  const field = label => `[...document.querySelectorAll('dialog label,main label')].find(l=>l.querySelector('span')?.textContent===${JSON.stringify(label)})`;
  const fill = (label, value) => evaluate(`(()=>{const input=${field(label)}.querySelector('input,textarea');const proto=input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}))})()`);
  const select = (label, value) => evaluate(`(()=>{const input=${field(label)}.querySelector('select');input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  const navigate = async kind => { await evaluate(`document.querySelector('a[href="/finance/preview/${kind}"]').click()`); await wait(`location.pathname==='/finance/preview/${kind}'`); };
  const capture = async name => {
    if (/editor|details/.test(name)) await evaluate("document.querySelector('dialog').scrollTop=0");
    await writeFile(join(evidence, `${name}.png`), Buffer.from((await cdp('Page.captureScreenshot', { captureBeyondViewport: !/editor|details/.test(name) })).data, 'base64'));
  };
  const escape = async () => { await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await wait("!document.querySelector('dialog')"); };
  const kinds = ['sales-invoice','purchase-invoice','receipt','payment','journal','credit-note','debit-note'];
  for (const kind of kinds) {
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await navigate(kind); await click('New transaction draft'); await wait("document.querySelector('dialog')?.open");
    await click('Save transaction draft'); await wait("document.querySelector('[role=alert]')?.textContent.includes('Reference must begin')");
    const reference = `DEMO-B3-${kind.toUpperCase()}`;
    await fill('Document reference', reference);
    if (kind.includes('invoice')) {
      await select('Fictional operational reference', kind === 'sales-invoice' ? 'DEMO-OP-SALES-01' : 'DEMO-OP-PURCHASE-01');
      await fill('Description 1','Fictional accounting representation'); await fill('Quantity 1','2'); await fill('Unit price 1','1000'); await fill('Illustrative tax % 1','10');
      await wait("document.querySelector('dialog').textContent.includes('Total: UGX 2,200')");
      await click('Add accounting line'); await fill('Description 2','Fictional extra line'); await fill('Unit price 2','100'); await click('Remove line 2');
    } else if (kind === 'receipt' || kind === 'payment') {
      await select(kind === 'receipt' ? 'Customer' : 'Supplier', kind === 'receipt' ? 'DEMO-P1' : 'DEMO-P2');
      await select('Fictional bank','DEMO-B1'); await select('Invoice 1', kind === 'receipt' ? 'DEMO-FINV-S1' : 'DEMO-FINV-P1');
      await wait(`document.querySelector('dialog').textContent.includes('Snapshot outstanding: UGX ${kind === 'receipt' ? '8,000' : '5,000'}')`);
      await fill('Entry amount','9000'); await fill('Allocation amount 1','9000'); await click('Save transaction draft');
      await wait("document.querySelector('[role=alert]')?.textContent.includes('exceed')");
      await fill('Entry amount','1000'); await fill('Allocation amount 1','999'); await click('Save transaction draft');
      await wait("document.querySelector('[role=alert]')?.textContent.includes('must equal')");
      await fill('Allocation amount 1','1000');
      await click('Add allocation'); await click('Remove allocation 2');
      if (kind === 'receipt') {
        await click('Add allocation');
        const secondId = await evaluate(`(()=>{const select=${field('Invoice 2')}.querySelector('select');return [...select.options].find(o=>o.textContent==='DEMO-B3-SALES-INVOICE').value})()`);
        await select('Invoice 2',secondId); await fill('Allocation amount 2','100'); await fill('Entry amount','1100');
      }
    } else if (kind === 'journal') {
      await select('Ledger 1','DEMO-A3'); await select('Ledger 2','DEMO-A2');
      await fill('Journal description 1','Fictional debit'); await fill('Journal description 2','Fictional credit');
      await fill('Debit 1','1000'); await fill('Credit 2','999'); await click('Save transaction draft');
      await wait("document.querySelector('[role=alert]')?.textContent.includes('must be equal')");
      await fill('Credit 2','600'); await click('Add journal line'); await select('Ledger 3','DEMO-A5'); await fill('Journal description 3','Fictional second credit'); await fill('Credit 3','400');
      await wait("document.querySelector('dialog').textContent.includes('Difference: UGX 0')");
    } else {
      await select(kind === 'credit-note' ? 'Customer' : 'Supplier',kind === 'credit-note' ? 'DEMO-P1' : 'DEMO-P2');
      await select('Linked invoice',kind === 'credit-note' ? 'DEMO-FINV-S1' : 'DEMO-FINV-P1');
      await fill('Adjustment reason','Fictional correction only'); await fill('Description 1','Fictional adjustment'); await fill('Unit price 1','9000');
      await click('Save transaction draft'); await wait("document.querySelector('[role=alert]')?.textContent.includes('exceed')");
      await fill('Unit price 1','100');
    }
    await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert.ok(await evaluate("document.querySelector('dialog').scrollWidth<=document.querySelector('dialog').clientWidth"), `${kind}: editor overflow`);
    await evaluate("document.querySelector('dialog').scrollTop=0"); await capture(`${kind}-editor-mobile`);
    await click('Save transaction draft'); await wait("!document.querySelector('dialog')");
    await wait(`document.body.textContent.includes('${reference}: local draft saved')`);
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await capture(`${kind}-desktop`);
    await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'), `${kind}: document overflow`);
    await capture(`${kind}-mobile`);
    await click(reference); await wait("document.querySelector('dialog')?.open");
    await wait("document.querySelector('dialog').textContent.includes('Local draft created; no posting')");
    await capture(`${kind}-details-mobile`);
    if (kind === 'receipt' || kind === 'payment' || kind.includes('note')) {
      await evaluate("[...document.querySelectorAll('dialog button')].find(b=>b.textContent.startsWith('DEMO-')&&b.textContent.includes('REF-01')).click()");
      await wait("document.querySelector('dialog').textContent.includes('Reference snapshot')");
    }
    await escape();
    await evaluate(`document.querySelector('button[aria-label="Edit ${reference}"]').click()`);
    await wait("document.querySelector('dialog')?.open"); await fill(kind.includes('note') ? 'Adjustment reason' : 'Memo','Edited fictional memo');
    await click('Save transaction draft'); await wait("!document.querySelector('dialog')");
    await click(reference); await wait("document.querySelector('dialog').textContent.includes('Local draft edited; no posting')"); await escape();
    await fill('Search finance documents','not-a-finance-document'); await wait("document.body.textContent.includes('No demo transactions match')"); await fill('Search finance documents','');
    await select('Document state','Reference snapshot');
    assert.equal(await evaluate(`[...document.querySelectorAll('td')].some(e=>e.textContent==='${reference}')`), false);
    await select('Document state','Draft');
    assert.ok(await evaluate(`[...document.querySelectorAll('td')].some(e=>e.textContent==='${reference}')`));
    await select('Document state','All');
    for (const label of ['Post transaction','Approve transaction','Execute payment','Send email','Financial export','Activate Finance']) assert.ok(await evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.startsWith('${label}')&&b.disabled)`));
  }
  // Retention across routes; reset discards all seven kinds and their history.
  await navigate('sales-invoice'); await wait("document.body.textContent.includes('DEMO-B3-SALES-INVOICE')");
  await navigate('receipt'); await wait("document.body.textContent.includes('DEMO-B3-RECEIPT')");
  await click('Reset preview'); await wait("!document.body.textContent.includes('DEMO-B3-RECEIPT')");
  await navigate('sales-invoice'); await wait("!document.body.textContent.includes('DEMO-B3-SALES-INVOICE')");
  await click('DEMO-SALES-REF-01'); await wait("document.querySelector('dialog').textContent.includes('Available: UGX 8,000')"); await escape();
  assert.equal(await evaluate("sessionStorage.getItem('navapack_access')"), 'synthetic-sentinel');
  console.log('PASS: Batch 3 seven transaction views: interactive calculations, invalid save guards, line editors, allocation/adjustment bounds, three-line journal balancing, add/edit/search/state/details/history/reference navigation, memory retention/reset, disabled financial actions, desktop/mobile overflow and screenshots.');
}
