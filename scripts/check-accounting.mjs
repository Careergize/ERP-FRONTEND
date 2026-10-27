import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// SSR screen fixtures exercise all new sections without contacting a real API or
// changing business data. Backend calculations are tested by accounting.tests.
const bootstrap={book:{company:'Synthetic company',currency:'UGX',startDate:'2026-01-01',fiscalMonth:1,valuation:'weighted-average',closedThrough:''},
  canWrite:true,canConfigure:true,parties:[{id:1,name:'Synthetic customer',kind:'customer'},{id:2,name:'Synthetic supplier',kind:'supplier'}],
  accounts:[{code:'1100',name:'Cash',kind:'asset',cash:true,control:false},{code:'1200',name:'Bank',kind:'asset',cash:true,control:false},{code:'2200',name:'VAT',kind:'liability',cash:false,control:true},{code:'6100',name:'Transport expense',kind:'expense',cash:false,control:false}]};
const report={currency:'UGX',profitLoss:{income:'200',expenses:'50',netProfit:'150',accounts:[]},balanceSheet:{assets:'200',liabilities:'50',equity:'0',retainedEarnings:'150',difference:'0',accounts:[]},trialBalance:[],trialDifference:'0',cashFlow:{operating:'70'},cashBank:[{code:'1100',name:'Cash',opening:'0',inflows:'70',outflows:'0',closing:'70'}],partyBalances:[],ledger:[],ledgerOpening:'0',ledgerClosing:'0',transactions:[],documents:[],inventory:[]};
const server=await createServer({configFile:false,plugins:[{name:'accounting-screen-fixtures',enforce:'pre',transform(source,id){
  if(!id.replaceAll('\\','/').split('?')[0].endsWith('/pages/Accounting.tsx'))return;
  const tab=new URL('http://test/?'+id.split('?').slice(1).join('?')).searchParams.get('screen')??'Overview';
  return source.replace('useState<Bootstrap|null>(null)',`useState<Bootstrap|null>(${JSON.stringify(bootstrap)})`)
    .replace('useState<Report|null>(null)',`useState<Report|null>(${JSON.stringify(report)})`)
    .replace("useState('Overview')",`useState(${JSON.stringify(tab)})`);
}}],resolve:{alias:{'@':fileURLToPath(new URL('../src',import.meta.url))}},optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false},appType:'custom'});
try{
  for(const [screen,expected] of [['Overview','Net profit / loss'],['Transactions','Post a financial transaction'],['Apply Advances','Apply an existing receipt / payment'],['Purchase Bills','Supplier bill from saved purchase'],['Ledgers','Items and prices for this party'],['Reports','Export report CSV'],['Inventory','Inventory valuation'],['Posting Queue','Capture existing operational records since cutover'],['Setup','LED account mapping']]){
    // Separate query IDs prevent fixture modules from sharing cached initial state.
    const {AccountingPage}=await server.ssrLoadModule('/src/pages/Accounting.tsx?screen='+encodeURIComponent(screen));
    const html=renderToStaticMarkup(React.createElement(AccountingPage));
    assert.ok(html.includes(expected),`${screen}: missing expected content`);
    assert.ok(html.includes('Synthetic company'));
  }
  console.log('PASS: all nine accounting sections render with configured API-shaped fixtures. Browser interaction, API transport and financial calculations are separate checks.');
}finally{await server.close();}
