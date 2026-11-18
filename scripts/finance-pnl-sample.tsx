import React from 'react';
import { createRoot } from 'react-dom/client';
import { ProfitLossStatement, type DetailedProfitLossData } from '../src/pages/FinanceProfitLoss';
import '../src/index.css';
import '../src/pages/finance.css';

const definitions = [
  ['sales','Sales Accounts', {'Sales Accounts':['Sales']}],
  ['cost_of_sales','Cost of goods sold', {'Cost of Goods Sold':['Cost of Goods Sold']}],
  ['direct_expense','Direct Expenses', {'Direct Expenses':['Factory Wages','Salary Advance'],'Purchase Accounts':['Purchases']}],
  ['other_income','Indirect Income', {'Other Income':['Interest Received'],'Transport Received':['Transport Received']}],
  ['indirect_expense','Indirect Expenses', {
    'Admin & Operation Expenses':['Fuel Expense','Office Rent'],
    ...Object.fromEntries(['Employment Expenses','Finance Expenses','Remuneration','Staff Welfare',
      'Authorities Expenses','Casual Salary','Charles Salary Adv','Depreciation','Expatriate Salary',
      'Legal Expense','Maintenance & Repair','Maintenance & Repairing (Recycle)'].map(name => [name,[name]])),
  }],
] satisfies [string,string,Record<string,string[]>][];

let id = 0;
const sections = definitions.map(([key,label,definitions]) => {
  const accounts = Object.entries(definitions).flatMap(([group,names]) => names.map(name => {
    const entries = Array.from({length:5}, (_,index) => {
      const line = ++id;
      return {line,document:line,number:'SAMPLE-'+line,date:'2026-11-0'+(index+1),
        kind:'sample',voucherType:key === 'sales' ? 'Sales invoice' : index % 2 ? 'Purchase bill' : 'Expense voucher',
        customer:'Sample party',category:group,amount:String((index+1)*(key === 'sales' ? 10000 : 100)),
        currency:'UGX',fx:'1',paymentType:index % 2 ? 'credit' : 'cash'};
    });
    return {code:'SAMPLE-'+entries[0].line,name,group,entries,amount:String(entries.reduce((sum,entry)=>sum+Number(entry.amount),0))};
  }));
  const groups = Object.keys(definitions).map(name => ({
    name,total:String(accounts.filter(account=>account.group===name).reduce((sum,account)=>sum+Number(account.amount),0)),
  }));
  return {key,label,groups,accounts,total:String(groups.reduce((sum,group)=>sum+Number(group.total),0))};
});
const total = (key:string) => Number(sections.find(section=>section.key===key)?.total ?? 0);
const sales=total('sales'), costs=total('cost_of_sales')+total('direct_expense');
const otherIncome=total('other_income'), overhead=total('indirect_expense');
const gross=sales-costs, net=gross+otherIncome-overhead;
const data: DetailedProfitLossData = {
  company:'Sample company · fictional vouchers',currency:'UGX',start:'2026-11-01',end:'2026-11-30',customer:null,sections,
  salesBreakdown:['cash','credit'].map(kind=>({kind,label:kind,amount:String(sections[0].accounts.flatMap(account=>account.entries)
    .filter(entry=>entry.paymentType===kind).reduce((sum,entry)=>sum+Number(entry.amount),0))})),
  totals:{income:String(sales+otherIncome),expenses:String(costs+overhead),grossProfit:String(gross),
    netProfit:String(net),tradingTotal:String(Math.max(sales,costs)),operatingTotal:String(Math.max(gross+otherIncome,overhead))},
  stock:null,purchases:null,warnings:[],pendingEvents:[],companyUnassigned:{income:'0',expenses:'0'},basis:'Fictional data for testing.',
};
createRoot(document.getElementById('root')!).render(<ProfitLossStatement data={data}/>);

