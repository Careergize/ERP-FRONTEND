import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import net from 'node:net';
import {createServer} from 'vite';
import React from 'react';
import {MemoryRouter} from 'react-router-dom';
import {renderToStaticMarkup} from 'react-dom/server';
globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
globalThis.sessionStorage=globalThis.localStorage;globalThis.window=new EventTarget();
const server=await createServer({configFile:false,resolve:{alias:{'@':fileURLToPath(new URL('../src',import.meta.url))}},optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false},appType:'custom'});
const connect=net.Socket.prototype.connect;net.Socket.prototype.connect=function(){throw new Error('Outbound network blocked');};
try {
 const {api}=await server.ssrLoadModule('/src/lib/api.ts');
 const {catalogueApi}=await server.ssrLoadModule('/src/lib/catalogueApi.ts');
 const {registerError}=await server.ssrLoadModule('/src/lib/registerApi.ts');
 const {CatalogueItemEditor,CatalogueMovementForm}=await server.ssrLoadModule('/src/pages/Consumables/CatalogueForms.tsx');
 const {ConsumablesPage}=await server.ssrLoadModule('/src/pages/Consumables/ConsumablesPage.tsx');
 let fail=false;const calls=[];
 api.defaults.adapter=async config=>{calls.push(config);if(fail)throw new Error('Synthetic offline');let data={count:0,next:null,previous:null,results:[]};if(config.method==='post')data={id:'server-id',code:'CON-PAN-007',...JSON.parse(config.data)};return {data,status:200,statusText:'OK',headers:{},config};};
 const body={creation_request_id:'fixture-request',name:'Tea',category:'Pantry & Refreshments',subcategory:'Pantry & Refreshments',unit:'KG'};
 const saved=await catalogueApi.save('consumables',undefined,body);
 assert.equal(saved.code,'CON-PAN-007');assert.equal(saved.id,'server-id');assert.ok(!Object.hasOwn(JSON.parse(calls.at(-1).data),'code'));
 await catalogueApi.save('consumables',saved.id,{name:'Edited'});assert.equal(calls.at(-1).url,'/consumables/server-id/');assert.equal(calls.at(-1).method,'patch');
 const filters={category:'Pantry & Refreshments',department:'Stores',is_active:'true',ordering:'code'};
 await catalogueApi.list('consumables',filters,2);assert.deepEqual(calls.at(-1).params,{...filters,page:2});
 await catalogueApi.summary('consumables',filters);assert.equal(calls.at(-1).url,'/consumables/summary/');
 await catalogueApi.history('consumables',filters,2);assert.equal(calls.at(-1).url,'/consumables/history/');assert.equal(calls.at(-1).params.page,2);
 await catalogueApi.activity('consumables',filters,3);assert.equal(calls.at(-1).url,'/consumables/activity/');
 const movement={request_id:'stable-movement-request',movement_type:'OUT',quantity:'1',unit:'KG',department:'Stores',issued_to:'Staff',purpose:'Other'};
 await catalogueApi.post('consumables',saved.id,movement);assert.equal(calls.at(-1).url,'/consumables/server-id/movements/');assert.equal(JSON.parse(calls.at(-1).data).request_id,movement.request_id);
 await catalogueApi.post('spares','spare-id',{...movement,unit:'Each'});assert.equal(calls.at(-1).url,'/spares/spare-id/movements/');
 fail=true;await assert.rejects(catalogueApi.post('consumables',saved.id,movement),/Synthetic offline/);await assert.rejects(catalogueApi.summary('consumables',filters),/Synthetic offline/);await assert.rejects(catalogueApi.save('consumables',undefined,body),/Synthetic offline/);
 assert.doesNotMatch(registerError({response:{status:500,data:'<html>private traceback</html>'}}),/traceback|html/);
 assert.match(registerError({response:{status:400,data:{quantity:['Insufficient stock']}}}),/Insufficient/);
 for(const item of [undefined,{id:'legacy-id',code:'LEGACY-42',name:'Legacy',category:'',subcategory:'',unit:'Litres',is_active:true,created_by:7,created_at:'2020-01-01T00:00:00Z'}]) {
  const html=renderToStaticMarkup(React.createElement(CatalogueItemEditor,{item,onClose(){},onSaved(){}}));assert.match(html,/code<input[^>]*readonly/);assert.doesNotMatch(html,/provisional|demonstration|CON-IMP|CON-LOC/);if(item){assert.match(html,/LEGACY-42/);assert.match(html,/<option value="" selected="">Unclassified legacy record/);assert.match(html,/Permanent Item ID/);}
 }
 const form=renderToStaticMarkup(React.createElement(CatalogueMovementForm,{kind:'consumables',type:'OUT',items:[],onSaved(){},onCancel(){}}));assert.match(form,/Quantity Issued/);assert.match(form,/backend allocates/);assert.doesNotMatch(form,/DEMO-|provisional/);
 for(const view of [0,1,2,3,4,7,8,9,10,11]) {
  const html=renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:[`/consumables?view=${view}`]},React.createElement(ConsumablesPage)));
  assert.match(html,/Consumables views/);assert.doesNotMatch(html,/Load sample|Demonstration only|Imported Spare Parts|Local Spare Parts/);
 }
 const source=await readFile(new URL('../src/pages/Consumables/ConsumablesPage.tsx',import.meta.url),'utf8');assert.match(source,/return <ConnectedConsumables/);
 console.log('PASS: catalogue transport contracts, server-owned codes, request IDs, no error fallback, safe errors, legacy read-only fields and initial rendering of all production Consumables views. Browser interactions not covered.');
} finally {net.Socket.prototype.connect=connect;await server.close();}
