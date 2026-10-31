import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
const server=await createServer({configFile:false,resolve:{alias:{'@':fileURLToPath(new URL('../src',import.meta.url))}},optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false},appType:'custom'});
try{
 const {formatCurrencyDisplay:format,currencyWordsPreview:words}=await server.ssrLoadModule('/src/lib/currencyDisplay.ts');
 const usd={code:'USD',name:'US Dollar',symbol:'$',decimal_word:'cents'};
 assert.equal(format(1234.56,usd),'$1,234.56');
 assert.equal(format(1234.56,{...usd,suffix_symbol:true,space_between:true}),'1,234.56 $');
 assert.equal(format(1234567.89,{...usd,show_in_millions:true}),'$1.23 million');
 assert.equal(format(-12.6,{...usd,decimal_places:0}),'-$13');
 assert.equal(format(1.2,{...usd,decimal_places:4}),'$1.2000');
 assert.equal(words(12.05,usd),'twelve US Dollar and five cents only');
 assert.equal(words(12.6,{...usd,words_decimal_places:0}),'thirteen US Dollar only');
 assert.equal(words(0,usd),'zero US Dollar and zero cents only');
 assert.equal(words(-1.01,usd),'minus one US Dollar and one cents only');
 const amount=1234567.89;format(amount,{...usd,show_in_millions:true});assert.equal(amount,1234567.89);
 console.log('PASS: currency display precision, prefix/suffix/spacing, millions, negative amounts, decimal words, independent words precision and unchanged source amounts.');
}finally{await server.close();}
