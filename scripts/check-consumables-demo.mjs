import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
const server = await createServer({ configFile:false, resolve:{alias:{'@':fileURLToPath(new URL('../src',import.meta.url))}}, server:{middlewareMode:true,hmr:false},appType:'custom' });
try {
 const d = await server.ssrLoadModule('/src/lib/consumablesDemo.ts');
 const {ConsumablesWorkspace: ConsumablesPage, ItemForm, MovementForm, LegacyConsumablesReview} = await server.ssrLoadModule('/src/pages/Consumables/ConsumablesPage.tsx');
 const { ItemEditor } = await server.ssrLoadModule('/src/pages/Registers/ItemRegisterPage.tsx');
 const savedRecord={id:'backend-id',code:'LEGACY-42',name:'Saved item',unit:'Each',description:'',is_active:true,created_at:'2025-06-01T09:00:00Z',created_by:42};
 const savedHtml=renderToStaticMarkup(React.createElement(ItemEditor,{kind:'consumables',item:savedRecord,readOnly:false,onClose(){},onSaved(){}}));
 assert.match(savedHtml,/code<input[^>]*readonly=""[^>]*value="LEGACY-42"/);
 assert.match(savedHtml,/backend-id/); assert.match(savedHtml,/2025-06-01T09:00:00Z/); assert.match(savedHtml,/<dd>42<\/dd>/);
 const spareHtml=renderToStaticMarkup(React.createElement(ItemEditor,{kind:'spares',item:{...savedRecord,category:'LOCAL',minimum_stock:'0'},readOnly:false,onClose(){},onSaved(){}}));
 assert.match(spareHtml,/code<input[^>]*readonly/);
 assert.match(spareHtml,/Imported Spare/); assert.match(spareHtml,/Local Spare/);
 let state=d.seedDemo();
 assert.equal(Object.keys(d.categories).length,7); assert.equal(Object.values(d.categories).flat().length,14);
 assert.equal(d.balance(state,'demo-2'),0);
 const item={...d.blankItem(),code:d.suggestItemCode(state,d.blankItem().subcategory),name:'Test item',opening:5,minimum:3};
 state=d.saveDemoItem(state,item); const id=state.items.at(-1).id;
 state=d.saveDemoItem(state,{...state.items.at(-1),name:'Edited item'});
 assert.equal(state.items.at(-1).name,'Edited item');
 assert.throws(()=>d.saveDemoItem(state,{...item}),/Provisional/);
 assert.throws(()=>d.saveDemoItem(state,{...item,code:'INVALID',subcategory:'invalid'}),/required|supported/);
 const movement={id:'',itemId:id,type:'IN',date:'2026-10-28',quantity:2,cost:20,supplier:'Supplier',po:'PO',invoice:'INV',location:'Store',person:'Person',actor:'Recorder',department:'Stores',machine:'',job:'',purpose:'Other',remarks:''};
 state=d.postDemoMovement(state,movement); assert.equal(d.balance(state,id),7); assert.equal(state.movements.length,1);
 state=d.postDemoMovement(state,{...movement,type:'OUT',quantity:4}); assert.equal(d.balance(state,id),3); assert.equal(state.movements.length,2);
 assert.ok(d.balance(state,id)<=state.items.at(-1).minimum);
 assert.throws(()=>d.postDemoMovement(state,{...movement,type:'OUT',quantity:4}),/exceeds/);
 assert.throws(()=>d.postDemoMovement(state,{...movement,type:'OUT',quantity:6,date:'2026-10-27'}),/exceeds/);
 assert.throws(()=>d.postDemoMovement(state,{...movement,quantity:0}),/positive/);
 assert.throws(()=>d.saveDemoItem(state,{...state.items.at(-1),opening:100}),/locked/);
 assert.throws(()=>d.saveDemoItem(state,{...state.items.at(-1),unit:'KG'}),/locked/);
 state=d.postDemoMovement(state,{...movement,type:'OUT',quantity:3}); assert.equal(d.balance(state,id),0);
 state=d.saveDemoItem(state,{...state.items.at(-1),status:'Inactive'});
 assert.throws(()=>d.postDemoMovement(state,movement),/active/);

 // Category suggestions and immutable identities, including legacy codes.

 const originalSnapshot=structuredClone(state);
 const reviewItems=state.items.filter(d.requiresConsumableReview);
 assert.deepEqual(reviewItems.map(i=>[i.id,i.code,i.name]),[['demo-1','DEMO-2','Imported bearing'],['demo-2','DEMO-3','Local drive belt']]);
 assert.equal(state.items.filter(i=>!d.requiresConsumableReview(i)).length,5);
 assert.doesNotMatch(JSON.stringify(d.categories),/Spare/);
 assert.ok('Office Maintenance Supplies' in d.categories);
 assert.match(d.suggestItemCode(state,'Office Maintenance Supplies'),/^CON-OMT-/);
 for(const legacySpare of reviewItems) {
  assert.throws(()=>d.saveDemoItem(state,{...legacySpare,name:'Changed'}),/review or migration/);
  assert.throws(()=>d.saveDemoItem(state,{...legacySpare,category:'Pantry & Refreshments',subcategory:'Pantry & Refreshments'}),/review or migration/);
  assert.throws(()=>d.changeItemCategory(state,legacySpare,'Pantry & Refreshments','Pantry & Refreshments'),/review or migration/);
  assert.throws(()=>d.postDemoMovement(state,{...movement,itemId:legacySpare.id}),/review or migration/);
 }
 assert.deepEqual(state,originalSnapshot);
 const reviewState={...state,movements:[...state.movements,{...movement,itemId:'demo-1',reference:'EXISTING-REF',id:'existing'}]};
 const reviewHtml=renderToStaticMarkup(React.createElement(LegacyConsumablesReview,{state:reviewState}));
 assert.match(reviewHtml,/requiring review or migration/); assert.match(reviewHtml,/DEMO-2/); assert.match(reviewHtml,/DEMO-3/); assert.match(reviewHtml,/EXISTING-REF/);
 assert.match(reviewHtml,/read-only review/);
 const blockedForm=renderToStaticMarkup(React.createElement(ItemForm,{item:reviewItems[0],state:reviewState,onSave(){},onCancel(){}}));
 assert.doesNotMatch(blockedForm,/<form|<select/);
 const legacyOffice=state.items.find(i=>i.code==='DEMO-4');
 assert.ok(d.matchesConsumableCategory(legacyOffice,'Pantry & Refreshments'));
 assert.equal(d.matchesConsumableCategory(legacyOffice,'Office Stationery'),false);
 const editedOffice=d.saveDemoItem(state,{...legacyOffice,name:'Office edited'});
 assert.equal(editedOffice.items.find(i=>i.id===legacyOffice.id).category,legacyOffice.category);
 assert.equal(editedOffice.items.find(i=>i.id===legacyOffice.id).code,legacyOffice.code);
 const originalCodes=state.items.map(i=>i.code);
 const newPantry=d.changeItemCategory(state,d.blankItem(),'Pantry & Refreshments','Pantry & Refreshments');
 assert.equal(newPantry.code,'CON-PAN-001');
 assert.throws(()=>d.suggestItemCode(state,'Imported Spare Parts'),/supported/);
 assert.throws(()=>d.suggestItemCode(state,'Local Spare Parts'),/supported/);
 for(const [subcategory,prefix] of [['Housekeeping & Cleaning','HSK'],['Office Stationery','STA'],['Lubricants and oils','LUB'],['Factory safety supplies','SAF']]) assert.match(d.suggestItemCode({items:[],movements:[]},subcategory),new RegExp(`^CON-${prefix}-001$`));
 const user='Authenticated fixture (test-user)';
 let auditState=d.saveDemoItem(state,{...newPantry,name:'Pantry test',ledger:'Custom expense classification'},user);
 const pantry=auditState.items.at(-1);
 assert.strictEqual(d.saveDemoItem(auditState,pantry,user),auditState);
 assert.equal(pantry.createdBy,user); assert.ok(!Number.isNaN(Date.parse(pantry.createdAt)));
 assert.equal(auditState.activities.at(-1).action,'Item Created');
 assert.equal(auditState.activities.at(-1).performedBy,user);
 assert.equal(auditState.activities.at(-1).code,pantry.code);
 assert.throws(()=>d.saveDemoItem(auditState,{...pantry,code:'CHANGED'}),/cannot be changed/);
 const changed=d.changeItemCategory(auditState,pantry,'Housekeeping & Cleaning','Housekeeping & Cleaning');
 assert.equal(changed.code,pantry.code);
 auditState=d.saveDemoItem(auditState,{...changed,status:'Inactive'},user);
 assert.ok(auditState.activities.some(a=>a.action==='Item Updated' && a.previous.includes('Pantry')));
 assert.ok(auditState.activities.some(a=>a.action==='Item Activated / Deactivated' && a.previous==='Active' && a.next==='Inactive'));
 assert.equal(d.suggestItemCode(auditState,'Pantry & Refreshments'),'CON-PAN-002');
 const removed={...auditState,items:auditState.items.filter(i=>i.id!==pantry.id)};
 assert.equal(d.suggestItemCode(removed,'Pantry & Refreshments'),'CON-PAN-002');
 assert.deepEqual(state.items.map(i=>i.code),originalCodes);
 const legacy=state.items.find(i=>i.code==='DEMO-1');
 const legacyState=d.saveDemoItem(state,{...legacy,name:'Legacy edited'},user);
 assert.equal(legacyState.items.find(i=>i.id===legacy.id).code,'DEMO-1');
 assert.equal(legacyState.items.find(i=>i.id===legacy.id).createdAt,undefined);
 assert.equal(legacyState.items.find(i=>i.id===legacy.id).createdBy,undefined);
 const missingActor=d.saveDemoItem(state,{...newPantry,name:'No identity'});
 assert.equal(missingActor.activities.at(-1).performedBy,undefined);
 const m1=d.postDemoMovement(auditState,{...movement,itemId:legacy.id},user);
 assert.equal(m1.movements.at(-1).reference,'CIN-2026-00002');
 const m2=d.postDemoMovement(m1,{...movement,itemId:legacy.id,type:'OUT',quantity:1},user);
 assert.equal(m2.movements.at(-1).reference,'COUT-2026-00003');
 assert.equal(new Set(m2.movements.map(m=>m.reference)).size,m2.movements.length);
 assert.equal(m2.activities.at(-1).action,'Stock OUT');
 assert.match(m2.activities.at(-1).remarks,/COUT-2026/);
 assert.notEqual(m2.activities.at(-1).previous,m2.activities.at(-1).next);
 const removedMovements={...m2,movements:[]};
 assert.equal(d.suggestMovementReference(removedMovements,'IN','2026-10-28'),'CIN-2026-00003');
 assert.equal(d.suggestMovementReference(m2,'IN','2027-01-01'),'CIN-2027-00001');
 for(const formItem of [newPantry,pantry,legacy]) {
  const html=renderToStaticMarkup(React.createElement(ItemForm,{item:formItem,state:auditState,onSave(){},onCancel(){}}));
  assert.match(html,/Item Code \(provisional frontend\).*?readonly=""/);
  assert.match(html,/Permanent Item ID/);
  assert.match(html,/Expense \/ Ledger Classification/);
  assert.doesNotMatch(html,/Spare Part Number|Imported Spare Parts|Local Spare Parts/);
 }
 const movementHtml=renderToStaticMarkup(React.createElement(MovementForm,{type:'IN',state:auditState,onSave(){},onCancel(){}}));
 assert.doesNotMatch(movementHtml,/Imported bearing|Local drive belt/);
 assert.match(movementHtml,/Movement Reference \(provisional\).*?readonly=""/);

 for(let view=0;view<=11;view++) {
  const html=renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:[`/consumables?view=${view}`]},React.createElement(ConsumablesPage)));
  assert.match(html,/Consumables views/);
  assert.doesNotMatch(html,/Imported Spare Parts|Local Spare Parts|Spare Part Number/);
  assert.match(html,view===0?/Loading consumables/:/Demonstration only/);
  if(view===5 || view===6) assert.match(html,/<h1[^>]*>Consumables Overview<\/h1>/);
  if(view===3) assert.match(html,/Quantity Received/);
  if(view===4) assert.match(html,/Quantity Issued/);
  if(view===11) { assert.match(html,/not a permanent or tamper-proof/); assert.match(html,/No local activity records/); }
 }
 console.log('PASS: separate categories/navigation, preserved legacy review records and blocked spare operations, provisional category codes, immutable/legacy identities, non-reuse, references, audit metadata/activity, read-only SSR fields, demo creation/edit, categories, duplicate codes, IN/OUT, overdraft/backdating, locks, low/out-of-stock, inactive validation and SSR of 10 retained views and two retired-view fallbacks. Browser interactions not covered.');
} finally {await server.close();}

