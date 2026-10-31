import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { FinanceTable } from './FinanceInsights';
import { currencyDefaults, formatCurrencyDisplay, currencyWordsPreview, type CurrencyDisplay } from '@/lib/currencyDisplay';

export function FinanceCurrencies({currencies,canConfigure,busy,onSave}:{currencies:CurrencyDisplay[];canConfigure:boolean;busy:boolean;onSave:(kind:string,payload:Record<string,unknown>)=>Promise<boolean>}){
  const [currency,setCurrency]=useState({...currencyDefaults});
  const submit=async(e:FormEvent)=>{e.preventDefault();if(await onSave('currencies',currency))setCurrency({...currencyDefaults});};
  const valid=[currency.decimal_places,currency.words_decimal_places].every(n=>Number.isInteger(n)&&n>=0&&n<=6);
  const yesNo=(label:string,key:'show_in_millions'|'suffix_symbol'|'space_between')=><label>{label}<select value={currency[key]?'yes':'no'} onChange={e=>setCurrency({...currency,[key]:e.target.value==='yes'})}><option value="no">No</option><option value="yes">Yes</option></select></label>;
  return <><Card><h3 className="font-semibold">Currency creation</h3><p className="finance-footnote">Define currency identity and display preferences. Exchange rates are entered on transactions. Accounting postings retain two decimal places; these preferences are previewed here and do not change existing reports or documents.</p><form className="mt-4" onSubmit={e=>void submit(e)}><fieldset disabled={!canConfigure||busy} className="finance-form-grid">
    <label>Symbol<input maxLength={12} value={currency.symbol} onChange={e=>setCurrency({...currency,symbol:e.target.value})} placeholder="$ or UGX"/></label>
    <label>Formal name<input required maxLength={100} value={currency.name} onChange={e=>setCurrency({...currency,name:e.target.value})} placeholder="US Dollar"/></label>
    <label>ISO Currency Code<input required pattern="[A-Z]{3}" maxLength={3} value={currency.code} onChange={e=>setCurrency({...currency,code:e.target.value.toUpperCase()})} placeholder="USD"/></label>
    <label>Number of decimal places<input required type="number" min={0} max={6} step={1} value={Number.isFinite(currency.decimal_places)?currency.decimal_places:''} onChange={e=>setCurrency({...currency,decimal_places:e.target.valueAsNumber})}/></label>
    {yesNo('Show amount in millions','show_in_millions')}
    {yesNo('Suffix symbol to amount','suffix_symbol')}
    {yesNo('Add space between amount and symbol','space_between')}
    <label>Word representing amount after decimal<input maxLength={100} value={currency.decimal_word} onChange={e=>setCurrency({...currency,decimal_word:e.target.value})} placeholder="cents"/></label>
    <label>No. of decimal places for amount in words<input required type="number" min={0} max={6} step={1} value={Number.isFinite(currency.words_decimal_places)?currency.words_decimal_places:''} onChange={e=>setCurrency({...currency,words_decimal_places:e.target.valueAsNumber})}/></label>
    <button className="finance-primary" disabled={!valid}><Plus size={16}/>Create currency</button>
  </fieldset></form><div className="mt-4 rounded border bg-gray-50 p-3 text-sm" aria-label="Currency display preview"><p>Display preview (1,234,567.89): <strong>{valid?formatCurrencyDisplay(1234567.89,currency):'Enter 0–6 decimal places'}</strong></p><p>In words: {valid?currencyWordsPreview(1234567.89,currency):'Enter 0–6 decimal places'}</p></div></Card><Card><FinanceTable rows={currencies.map(c=>({...c,decimals:c.decimal_places??2,millions:c.show_in_millions?'Yes':'No',placement:c.suffix_symbol?'Suffix':'Prefix',spacing:c.space_between?'Yes':'No',decimalWord:c.decimal_word||'—',wordsDecimals:c.words_decimal_places??2,preview:formatCurrencyDisplay(1234.56,c)}))} columns={[["symbol","Symbol"],["name","Formal name"],["code","ISO code"],["decimals","Decimals"],["millions","Millions"],["placement","Symbol placement"],["spacing","Space"],["decimalWord","Decimal word"],["wordsDecimals","Words decimals"],["preview","Preview"]]}/></Card></>;
}
