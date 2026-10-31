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
const report={currency:'UGX',profitLoss:{income:'200',expenses:'50',netProfit:'150',accounts:[]},balanceSheet:{assets:'200',liabilities:'50',equity:'0',retainedEarnings:'150',difference:'0',accounts:[]},trialBalance:[],trialDifference:'0',cashFlow:{operating:'70'},cashBank:[{code:'1100',name:'Cash',opening:'0',inflows:'70',outflows:'0',closing:'70'}],partyBalances:[],ledger:[],ledgerOpening:'0',ledgerClosing:'0',transactions:[],documents:[],inventory:[],customerProfit:{rows:[],details:[],unassignedIncome:'0',unassignedCosts:'0',unassignedNet:'0',companyNetProfit:'150'},assignableCosts:[],orderCommitments:{asOf:'2026-02-28',sales:[],purchases:[],totals:[],issues:[],basis:'Synthetic scope'}};
const server=await createServer({configFile:false,plugins:[{name:'accounting-screen-fixtures',enforce:'pre',transform(source,id){
  if(!id.replaceAll('\\','/').split('?')[0].endsWith('/pages/Accounting.tsx'))return;
  const tab=new URL('http://test/?'+id.split('?').slice(1).join('?')).searchParams.get('screen')??'Overview';
  return source.replace('useState<Bootstrap|null>(null)',`useState<Bootstrap|null>(${JSON.stringify(bootstrap)})`)
    .replace('useState<Report|null>(null)',`useState<Report|null>(${JSON.stringify(report)})`)
    .replace("useState('Overview')",`useState(${JSON.stringify(tab)})`);
}}],resolve:{alias:{'@':fileURLToPath(new URL('../src',import.meta.url))}},optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false},appType:'custom'});
try{
  for(const [screen,expected] of [['Overview','Net profit / loss'],['Analysis','Analysis home'],['Profitability','Customer profitability'],['Orders','Uninvoiced orders'],['Transactions','Post a financial transaction'],['Apply Advances','Apply an existing receipt / payment'],['Purchase Bills','Supplier bill from saved purchase'],['Ledgers','Items and prices for this party'],['Reports','Overall company'],['Inventory','Inventory valuation'],['Posting Queue','Capture existing operational records since cutover'],['Masters','Organise your books'],['Setup','LED account mapping']]){
    // Separate query IDs prevent fixture modules from sharing cached initial state.
    const {AccountingPage}=await server.ssrLoadModule('/src/pages/Accounting.tsx?screen='+encodeURIComponent(screen));
    const html=renderToStaticMarkup(React.createElement(AccountingPage));
    assert.ok(html.includes(expected),`${screen}: missing expected content`);
    assert.ok(html.includes('Synthetic company'));
  }
  const {trendRows,FinanceAnalysisHome}=await server.ssrLoadModule('/src/pages/FinanceAnalysisHome.tsx');
  assert.deepEqual(trendRows([
    {kind:'invoice',date:'2026-02-02',baseNet:'100'},
    {kind:'invoice',date:'2026-02-04',baseNet:'-30'},
    {kind:'invoice',date:'2026-01-01',baseNet:'10'},
    {kind:'bill',date:'2026-02-02',baseNet:'900'}
  ],'invoice'),[{month:'2026-01',total:10},{month:'2026-02',total:70}]);
  const home=renderToStaticMarkup(React.createElement(FinanceAnalysisHome,{report,start:'2026-01-01',end:'2026-02-28',onReport:()=>{},onAccount:()=>{}}));
  for(const title of ['Sales trend','Purchase trend','Trading details','Cash in / out flow','Receivables / payables','Assets / liabilities','Accounting ratios','Top accounts / ledgers'])assert.ok(home.includes(title),title);
  assert.ok(home.includes('Not available'),'Missing cash-flow detail must not become zero');
  const {FinanceAnalysis}=await server.ssrLoadModule('/src/pages/FinanceAnalysis.tsx');
  const registers=renderToStaticMarkup(React.createElement(FinanceAnalysis,{documents:[],parties:[],currency:'UGX',onCreate:()=>{},onLedger:()=>{},onExport:()=>{}}));
  assert.ok(registers.includes('Receipt register'));
  const {financeErrorMessage}=await server.ssrLoadModule('/src/lib/financeApiErrors.ts');
  const htmlError=financeErrorMessage({response:{status:500,data:'<!doctype html><html><body>Server Error</body></html>'},config:{url:'/accounting/setup/?token=private'}});
  assert.ok(htmlError.includes('HTTP 500'));assert.ok(htmlError.includes('/accounting/setup/'));assert.ok(!htmlError.includes('<html>'));assert.ok(!htmlError.includes('private'));
  assert.ok(financeErrorMessage({response:{status:503,data:{detail:'Accounting database update required. Run python manage.py migrate accounting.'}}}).includes('migrate accounting'));
  assert.equal(financeErrorMessage({response:{status:400,data:{amount:['Must be positive.']}}}),'{"amount":["Must be positive."]}');
  console.log('PASS: all thirteen accounting sections render with configured API-shaped fixtures. Browser interaction, API transport and financial calculations are separate checks.');
}finally{await server.close();}




