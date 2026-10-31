export interface CurrencyDisplay {
  code:string; name:string; symbol:string; decimal_places?:number; show_in_millions?:boolean;
  suffix_symbol?:boolean; space_between?:boolean; decimal_word?:string; words_decimal_places?:number;
}
export const currencyDefaults={code:'',name:'',symbol:'',decimal_places:2,show_in_millions:false,suffix_symbol:false,space_between:false,decimal_word:'',words_decimal_places:2};

/** Display only: never use this rounded/scaled value for posting or FX. */
export function formatCurrencyDisplay(amount:number,currency:CurrencyDisplay){
  const c={...currencyDefaults,...currency};
  const number=new Intl.NumberFormat('en-US',{minimumFractionDigits:c.decimal_places,maximumFractionDigits:c.decimal_places}).format(Math.abs(amount)/(c.show_in_millions?1_000_000:1));
  const symbol=c.symbol||c.code,space=c.space_between&&symbol?' ':'';
  return (amount<0?'-':'')+(c.suffix_symbol?number+space+symbol:symbol+space+number)+(c.show_in_millions?' million':'');
}

const ones=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function integerWords(n:number):string{
  if(n<20)return ones[n];
  if(n<100)return tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'');
  if(n<1000)return ones[Math.floor(n/100)]+' hundred'+(n%100?' '+integerWords(n%100):'');
  for(const [value,name] of [[1e12,'trillion'],[1e9,'billion'],[1e6,'million'],[1000,'thousand']] as const){
    if(n>=value)return integerWords(Math.floor(n/value))+' '+name+(n%value?' '+integerWords(n%value):'');
  }
  return '';
}
export function currencyWordsPreview(amount:number,currency:CurrencyDisplay){
  const c={...currencyDefaults,...currency};
  if(!Number.isFinite(amount)||Math.abs(amount)>=1e12)return 'Amount exceeds words preview range';
  const [whole,fraction='']=Math.abs(amount).toFixed(c.words_decimal_places).split('.');
  return (amount<0?'minus ':'')+integerWords(Number(whole))+' '+(c.name||c.code)+(fraction?' and '+integerWords(Number(fraction))+' '+(c.decimal_word||`parts per ${10**c.words_decimal_places}`):'')+' only';
}
