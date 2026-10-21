import { validDate } from './stockIntelligence';
import { RAW_MATERIALS, rawMaterialBalance, type RawMaterial, type RawMaterialMovement } from './rawMaterialData';

export interface PlannedDelivery { id: string; supplier: string; date: string; quantity: number }
export interface ProcurementItem { id: string; name: string; unit: string; stock: number | null; asOfDate?: string; currentStock?: number|null; monthly: number; days: number; lead: number; comment: string; materialId?: string; version?: number; deliveries: PlannedDelivery[] }
// Source: Procurement Planner (1).xlsx, Sheet1, report dated 16 October 2026.
// Units are not explicitly stated. Blank stock is preserved as unknown.
const reference: [string, number | null, number][] = [
  ['HDPE',52.75,26.78], ['LDPE',10.05,8], ['LDPE Off grade',49.75,8], ['LLDPE',22,17],
  ['DESSICANT /DEFOAMER',1.7,.783], ['BLACK BM',3.05,1.75], ['FILLER SP6121',16.1,6.25],
  ['BEIGE KRISHINA',null,.05], ['ANTIBLOCK (04001)',.175,.1], ['ORANGE',.1,.05],
  ['YELLOW 12157',.075,.05], ['BLUE (487)',.05,.125], ['GREEN MB',.15,.125], ['WHITE MB',.125,.625],
];
export const procurementReference = (): ProcurementItem[] => reference.map(([name,stock,monthly],i)=>({id:`planner-${i}`,name,stock,monthly,unit:'workbook units',days:26,lead:75,comment:'',deliveries:[]}));
export const procurementMaterials = (materials: RawMaterial[] = RAW_MATERIALS): ProcurementItem[] => materials.map(m=>({id:`planner-${m.id}`,materialId:m.id,name:m.name,unit:m.unit,stock:m.currentStock??null,monthly:0,days:26,lead:75,comment:'',deliveries:[]}));
export function procurementChoices(materials:RawMaterial[],saved:ProcurementItem[]){
  return procurementMaterials(materials).map(choice=>{
    const plan=saved.find(p=>p.materialId===choice.materialId);
    if(!plan)return choice;
    return plan;
  });
}
export function inventoryPlan(item: ProcurementItem, movements: RawMaterialMovement[], date: string, materials: RawMaterial[] = RAW_MATERIALS) {
  const material=materials.find(m=>m.id===item.materialId);
  if (!material) throw new Error('Select an existing raw material.');
  const stock=rawMaterialBalance(material,movements).currentStock;
  const outs=movements.filter(m=>m.materialId===material.id&&m.unit===material.unit&&m.movementType==='OUT'&&m.date<=date);
  return {stock,actual:outs.filter(m=>m.date.startsWith(date.slice(0,7))).reduce((n,m)=>n+m.quantity,0),dailyActual:outs.filter(m=>m.date===date).reduce((n,m)=>n+m.quantity,0),
    plan:{...item,name:material.name,unit:material.unit,stock:stock===null?null:Math.max(0,stock)}};
}
export function validatePlan(item: ProcurementItem) {
  if(item.asOfDate&&!validDate(item.asOfDate))throw new Error('Enter a valid stock date.');
  if (!item.name.trim() || !item.unit.trim() || (item.stock !== null && (!Number.isFinite(item.stock) || item.stock < 0)) || !Number.isFinite(item.monthly) || item.monthly < 0 || !Number.isInteger(item.days) || item.days < 1 || item.days > 31 || !Number.isInteger(item.lead) || item.lead < 0 || item.lead > 3650) throw new Error('Enter a name, unit, nonnegative quantities, 1–31 consumption days and 0–3650 lead days.');
  for (const d of item.deliveries) if (!d.supplier.trim() || !validDate(d.date) || !Number.isFinite(d.quantity) || d.quantity <= 0) throw new Error('Each delivery needs a supplier, exact arrival date and positive quantity.');
}
export function procurementRemainingStock(item:ProcurementItem,date:string){
  validatePlan(item);
  if(!validDate(date))throw new Error('Select a valid report date.');
  return item.stock;
}
export function procurementEditPlan(item:ProcurementItem,date:string):ProcurementItem{
  // Opening/editing a plan never changes the manually recorded balance or date.
  return {...structuredClone(item),currentStock:item.stock,asOfDate:item.asOfDate??date};
}
export function datedProcurementMetrics(item:ProcurementItem,date:string){
  return {...procurementMetrics(item,date),stock:procurementRemainingStock(item,date)};
}
const addDays = (date: string, days: number) => {
  const result=new Date(Date.parse(date+'T00:00:00Z')+days*86400000);
  return Number.isFinite(result.getTime())?result.toISOString().slice(0,10):null;
};
export function procurementMetrics(item: ProcurementItem, date: string) {
  validatePlan(item);
  if (!validDate(date)) throw new Error('Select a valid report date.');
  const daily=item.monthly/item.days;
  const coverage=item.stock===null || daily===0 ? null : item.stock/daily;
  const stockDate=item.asOfDate??date;
  const stockUpto=coverage===null ? null : addDays(stockDate,Math.floor(coverage));
  const reorder=stockUpto===null ? null : addDays(stockUpto,-item.lead);
  let continuous=coverage;
  const deliveries=[...item.deliveries].sort((a,b)=>a.date.localeCompare(b.date)).map(d=>{
    const elapsed=(Date.parse(d.date+'T00:00:00Z')-Date.parse(stockDate+'T00:00:00Z'))/86400000;
    const status=d.date<date?'Overdue / confirm receipt':continuous===null?'Coverage unknown':elapsed>continuous?'Gap before arrival':'On time';
    if (continuous!==null && elapsed>=0 && elapsed<=continuous && d.date>=date) continuous+=d.quantity/daily;
    return {...d,status};
  });
  return {daily,coverage,stockUpto,reorder,deliveries,continuous, status:item.stock===null?'Stock unknown':item.stock===0?'Out of stock':daily===0?'No consumption plan':reorder!==null&&reorder<=date?'Order now':'Covered'};
}
