export interface PlannedCostInput {
  currency: string;
  materials: { materialId: string; name: string; quantity: number; unit: string; price: number | null; priceUnit: string; currency: string | null; exchangeRate: number | null; priceIncludesVAT: boolean; purchaseTaxRate: number | null }[];
  processes: { stageId: string; name: string; basis: string; rate: number | null; quantity: number | null; unit: string }[];
  overheads: number | null; additionalCosts: number | null; taxRate: number | null;
  ledApplies: boolean; eligibleWeightKG: number | null; weightReference: string; usdToUGX: number | null; fxDate: string; vatOnLED: boolean; ledBase: string;
}
export interface PlannedCosting {
  revision: number; status: 'Draft' | 'Approved'; input: PlannedCostInput; basis: 'planned';
  validationError: string; approvedBy?: string; approvedAt?: string; actualCost: null;
  totals: null | { materialCost: number; processCost: number; productionCost: number; costPerUnit: number;
    materials: { materialId: string; netUnitPrice: number; total: number }[];
    processes: { stageId: string; total: number }[];
    scenarios: { markup: number; profit: number; beforeTax: number; led: number; vat: number; total: number; unitPrice: number }[] };
}
