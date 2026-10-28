export const categories = {
  'Factory & Production Consumables': ['Lubricants and oils', 'Machine cleaning materials', 'Printing consumables', 'Electrical consumables', 'Packaging consumables', 'Tools and workshop supplies', 'Quality control supplies', 'Factory safety supplies'],
  'Pantry & Refreshments': ['Pantry & Refreshments'],
  'Housekeeping & Cleaning': ['Housekeeping & Cleaning'],
  'Office Stationery': ['Office Stationery'],
  'Office Maintenance Supplies': ['Office Maintenance Supplies'],
  'Employee Welfare': ['Employee Welfare'],
  'General Administration': ['General Administration'],
};
const legacyOfficeCategory = 'Office & Administration Consumables';
const legacyOfficeSubcategories = ['Pantry & Refreshments', 'Housekeeping & Cleaning', 'Office Stationery', 'Office Maintenance', 'Employee Welfare', 'General Administration'];
export function categorySubcategories(category: string): string[] {
  return categories[category as keyof typeof categories] ?? (category === legacyOfficeCategory ? legacyOfficeSubcategories : []);
}
export function requiresConsumableReview(item: Pick<DemoItem, 'category' | 'subcategory'>) {
  return /spare/i.test(item.category) || /spare/i.test(item.subcategory);
}
export function officeConsumable(item: DemoItem) {
  return !requiresConsumableReview(item) && item.category !== 'Factory & Production Consumables';
}
export function matchesConsumableCategory(item: DemoItem, category: string) {
  if (!category || item.category === category) return true;
  // Match legacy office records for filtering without rewriting their stored classification.
  return item.category === legacyOfficeCategory && (item.subcategory === 'Office Maintenance' ? 'Office Maintenance Supplies' : item.subcategory) === category;
}
export const units = ['Each', 'Pair', 'Set', 'Box', 'Pack', 'Roll', 'KG', 'Gram', 'Litre', 'Millilitre', 'Metre', 'Both'];
export const departments = ['Office / Administration', 'Production', 'Maintenance', 'Quality Control', 'Stores', 'Other'];
export const purposes = ['Office Consumption', 'Pantry / Staff Refreshments', 'Housekeeping', 'Machine Maintenance', 'Production Support', 'Quality Control', 'Employee Welfare', 'Other'];
export const ledgers = ['Staff Welfare / Pantry Expenses', 'Office Housekeeping Expenses', 'Factory Overheads', 'Printing & Stationery Expenses', 'Repairs & Maintenance – Office', 'Repairs & Maintenance – Plant & Machinery', 'Factory Consumables / Manufacturing Overheads'];
export const examples: Record<string, string> = {
  'Pantry & Refreshments': 'Tea powder, coffee powder, sugar, milk, biscuits, drinking water',
  'Housekeeping & Cleaning': 'Phenyl, floor cleaner, tissue paper, garbage bags, handwash, air fresheners',
  'Office Stationery': 'Paper, pens, notebooks, files, printer cartridges, stapler pins',
  'Office Maintenance': 'Bulbs, batteries, minor electrical and plumbing supplies',
  'Employee Welfare': 'First-aid consumables, hygiene supplies, staff refreshments',
  'General Administration': 'Miscellaneous office supplies',
};
export interface DemoItem {
  createdBy?: string; createdAt?: string; updatedBy?: string; updatedAt?: string;
  id: string; code: string; name: string; category: keyof typeof categories | 'Spare Parts' | 'Office & Administration Consumables'; subcategory: string;
  description: string; unit: string; opening: number; minimum: number; reorder: number; cost: number;
  supplier: string; location: string; department: string; machine: string; part: string; lastPurchase: string;
  status: 'Active' | 'Inactive'; ledger: string;
}
export interface DemoMovement {
  reference?: string;
  id: string; itemId: string; type: 'IN' | 'OUT'; date: string; quantity: number; cost: number;
  supplier: string; po: string; invoice: string; location: string; person: string; actor: string;
  department: string; machine: string; job: string; purpose: string; remarks: string;
}
export const activityTypes = ['Item Created', 'Item Updated', 'Item Activated / Deactivated', 'Stock IN', 'Stock OUT', 'Stock Adjustment'] as const;
export interface DemoActivity {
  reference: string; itemId: string; code: string; action: typeof activityTypes[number];
  previous: string; next: string; performedBy?: string; at: string; remarks: string;
}
export interface DemoState {
  items: DemoItem[]; movements: DemoMovement[]; activities?: DemoActivity[];
  usedCodes?: string[]; usedReferences?: string[];
}
const categoryCodes: Record<string, string> = {
  'Lubricants and oils': 'LUB', 'Machine cleaning materials': 'MCL', 'Printing consumables': 'PRT',
  'Electrical consumables': 'ELE', 'Packaging consumables': 'PKG', 'Tools and workshop supplies': 'TLS',
  'Quality control supplies': 'QCS', 'Factory safety supplies': 'SAF',
  'Pantry & Refreshments': 'PAN', 'Housekeeping & Cleaning': 'HSK',
  'Office Stationery': 'STA', 'Office Maintenance Supplies': 'OMT', 'Office Maintenance': 'OMT', 'Employee Welfare': 'WEL', 'General Administration': 'ADM',
};
function nextSequence(prefix: string, values: string[], width: number) {
  const max = values.reduce((n, value) => {
    const suffix = value.toUpperCase().startsWith(prefix) ? value.slice(prefix.length) : '';
    return /^\d+$/.test(suffix) ? Math.max(n, Number(suffix)) : n;
  }, 0);
  if (!Number.isSafeInteger(max + 1)) throw new Error('Provisional sequence exhausted.');
  return prefix + String(max + 1).padStart(width, '0');
}
export function suggestItemCode(state: DemoState, subcategory: string) {
  const category = categoryCodes[subcategory];
  if (!category) throw new Error('Select a supported subcategory.');
  return nextSequence(`CON-${category}-`, [...state.items.map(i => i.code), ...(state.usedCodes ?? []), ...(state.activities ?? []).map(a => a.code)], 3);
}
export function suggestMovementReference(state: DemoState, type: 'IN' | 'OUT', date: string) {
  return nextSequence(`${type === 'IN' ? 'CIN' : 'COUT'}-${date.slice(0, 4)}-`, [...state.movements.map(m => m.reference ?? ''), ...(state.usedReferences ?? [])], 5);
}
export function changeItemCategory(state: DemoState, item: DemoItem, category: DemoItem['category'], subcategory: string): DemoItem {
  if (requiresConsumableReview(item) || !categorySubcategories(category).includes(subcategory) || category === 'Spare Parts') throw new Error('Legacy spare-classified records require review or migration; they cannot be reclassified here.');
  return { ...item, category, subcategory, code: item.id ? item.code : suggestItemCode(state, subcategory) };
}
function activity(item: DemoItem, action: DemoActivity['action'], previous: string, next: string, at: string, performedBy?: string, remarks = ''): DemoActivity {
  return { reference: `CACT-${crypto.randomUUID()}`, itemId: item.id, code: item.code, action, previous, next, at, performedBy, remarks };
}
export const today = () => new Date().toLocaleDateString('en-CA');
export function blankItem(): DemoItem {
  return { id: '', code: '', name: '', category: 'Factory & Production Consumables', subcategory: categories['Factory & Production Consumables'][0], description: '', unit: 'Each', opening: 0, minimum: 0, reorder: 0, cost: 0, supplier: '', location: '', department: 'Stores', machine: '', part: '', lastPurchase: '', status: 'Active', ledger: ledgers[6] };
}
export const round = (n: number) => Math.round(n * 1e6) / 1e6;
export function balance(state: DemoState, id: string) {
  return round((state.items.find(i => i.id === id)?.opening ?? 0) + state.movements.filter(m => m.itemId === id).reduce((n, m) => n + (m.type === 'IN' ? m.quantity : -m.quantity), 0));
}
export function saveDemoItem(state: DemoState, item: DemoItem, actor?: string): DemoState {
  const old = state.items.find(i => i.id === item.id);
  if (requiresConsumableReview(item) || (old && requiresConsumableReview(old))) throw new Error('Legacy spare-classified records require review or migration; no changes were made.');
  if (old && item.code !== old.code) throw new Error('Existing item codes cannot be changed.');
  if (!old && item.code !== suggestItemCode(state, item.subcategory)) throw new Error('Provisional code changed. Reopen the form to refresh the suggestion.');
  if (!item.name.trim() || !item.code.trim() || !categorySubcategories(item.category).includes(item.subcategory) || (!old && !(item.category in categories)) || !units.includes(item.unit) || !departments.includes(item.department) || !item.ledger.trim()) throw new Error('Complete the required item fields.');
  if ([item.opening, item.minimum, item.reorder, item.cost].some(n => !Number.isFinite(n) || n < 0)) throw new Error('Stock, reorder and cost must be nonnegative numbers.');
  if (state.items.some(i => i.id !== item.id && i.code.toLowerCase() === item.code.trim().toLowerCase())) throw new Error('Item code must be unique in the demonstration register.');
  if (old && state.movements.some(m => m.itemId === item.id) && (old.opening !== item.opening || old.unit !== item.unit)) throw new Error('Unit and opening stock are locked after movements.');
  const at = new Date().toISOString();
  const saved = { ...item, id: old?.id || crypto.randomUUID(), code: old?.code ?? item.code, name: item.name.trim(), createdBy: old?.createdBy ?? (!old ? actor : undefined), createdAt: old?.createdAt ?? (!old ? at : undefined), updatedBy: actor, updatedAt: at };
  const changes = old ? Object.keys(item).filter(k => !['createdBy', 'createdAt', 'updatedBy', 'updatedAt'].includes(k) && old[k as keyof DemoItem] !== saved[k as keyof DemoItem]) : [];
  if (old && !changes.length) return state;
  const entries = [...(state.activities ?? [])];
  if (!old) entries.push(activity(saved, 'Item Created', '—', JSON.stringify(saved), at, actor));
  else {
    if (changes.includes('status')) entries.push(activity(saved, 'Item Activated / Deactivated', old.status, saved.status, at, actor));
    const fields = changes.filter(k => k !== 'status');
    if (fields.length) entries.push(activity(saved, 'Item Updated', JSON.stringify(Object.fromEntries(fields.map(k => [k, old[k as keyof DemoItem]]))), JSON.stringify(Object.fromEntries(fields.map(k => [k, saved[k as keyof DemoItem]]))), at, actor));
  }
  return { ...state, items: old ? state.items.map(i => i.id === saved.id ? saved : i) : [...state.items, saved], activities: entries, usedCodes: [...new Set([...(state.usedCodes ?? []), ...state.items.map(i => i.code), saved.code])] };
}
export function postDemoMovement(state: DemoState, movement: DemoMovement, actor?: string): DemoState {
  const item = state.items.find(i => i.id === movement.itemId);
  if (item && requiresConsumableReview(item)) throw new Error('Legacy spare-classified records require review or migration; no stock was changed.');
  if (!item || item.status !== 'Active') throw new Error('Select an active demonstration item.');
  if (!Number.isFinite(movement.quantity) || movement.quantity <= 0 || round(movement.quantity) !== movement.quantity) throw new Error('Quantity must be positive with up to six decimal places.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(movement.date) || !movement.actor.trim()) throw new Error('Date and recorded by are required.');
  if (movement.type === 'OUT' && (!movement.person.trim() || !departments.includes(movement.department) || !purposes.includes(movement.purpose))) throw new Error('Issued to, department and purpose are required.');
  if (movement.type === 'IN' && (!movement.supplier.trim() || !movement.location.trim() || !Number.isFinite(movement.cost) || movement.cost < 0)) throw new Error('Supplier, storage location and a nonnegative unit cost are required.');
  const reference = suggestMovementReference(state, movement.type, movement.date);
  const movements = [...state.movements, { ...movement, reference, id: crypto.randomUUID() }];
  let available = item.opening;
  for (const row of movements.filter(m => m.itemId === item.id).sort((a, b) => a.date.localeCompare(b.date))) {
    available = round(available + (row.type === 'IN' ? row.quantity : -row.quantity));
    if (available < 0) throw new Error('Issue exceeds available demonstration stock on this date.');
  }
  const at = new Date().toISOString();
  return { ...state, items: state.items.map(i => i.id === item.id && movement.type === 'IN' && movement.date >= i.lastPurchase ? { ...i, lastPurchase: movement.date, cost: movement.cost, updatedBy: actor, updatedAt: at } : i), movements,
    usedReferences: [...new Set([...(state.usedReferences ?? []), ...state.movements.flatMap(m => m.reference ? [m.reference] : []), reference])],
    activities: [...(state.activities ?? []), activity(item, movement.type === 'IN' ? 'Stock IN' : 'Stock OUT', `${balance(state, item.id)} ${item.unit}`, `${round(balance(state, item.id) + (movement.type === 'IN' ? movement.quantity : -movement.quantity))} ${item.unit}`, at, actor, `${reference} · Entered ${movement.type === 'IN' ? 'received' : 'issued'} by: ${movement.actor}. ${movement.remarks}`)] };
}
export function seedDemo(): DemoState {
  const seeds: [string, DemoItem['category'], string, string, number, number][] = [
    ['Machine oil', 'Factory & Production Consumables', 'Lubricants and oils', 'Litre', 12, 5],
    ['Imported bearing', 'Spare Parts', 'Imported Spare Parts', 'Each', 2, 3],
    ['Local drive belt', 'Spare Parts', 'Local Spare Parts', 'Each', 0, 2],
    ['Tea powder', 'Office & Administration Consumables', 'Pantry & Refreshments', 'KG', 4, 2],
    ['Floor cleaner', 'Office & Administration Consumables', 'Housekeeping & Cleaning', 'Litre', 2, 3],
    ['Office paper', 'Office & Administration Consumables', 'Office Stationery', 'Pack', 8, 3],
  ];
  return { items: seeds.map(([name, category, subcategory, unit, opening, minimum], n) => ({ ...blankItem(), id: `demo-${n}`, code: `DEMO-${n + 1}`, name, category, subcategory, unit, opening, minimum, reorder: 5, cost: 10 + n * 5, department: category.startsWith('Office') ? departments[0] : 'Maintenance', ledger: category === 'Spare Parts' ? ledgers[5] : subcategory === 'Office Stationery' ? ledgers[3] : subcategory === 'Housekeeping & Cleaning' ? ledgers[1] : category.startsWith('Office') ? ledgers[0] : ledgers[6], supplier: 'Demo supplier', location: 'Demo store' })), movements: [] };
}
