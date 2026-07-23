import { EstimateMaterial, EstimateLabor, CalcResult, PaymentVariant } from '@/lib/shared/types';

export interface CalcInput {
  materials: EstimateMaterial[];
  labor: EstimateLabor[];
  markup: number;
  taxRate: number;
  laborRate?: number; // for reference
  financingFee: number;
  creditCardFee: number;
}

export function calculateEstimate(input: CalcInput): CalcResult {
  const { materials, labor, markup, taxRate, financingFee, creditCardFee } = input;

  // Materials with selling price (per line already or compute)
  const materialsSubtotal = materials.reduce((sum, m) => {
    const line = m.sellingPrice || (m.cost * (1 + markup) * m.qty);
    return sum + line;
  }, 0);

  const laborTotal = labor.reduce((sum, l) => sum + (l.cost || l.hours * l.rate), 0);

  // Tax on materials only by default (configurable later via settings)
  const taxableAmount = materialsSubtotal;
  const tax = taxableAmount * taxRate;

  const preTaxTotal = materialsSubtotal + laborTotal;
  const grandTotal = materialsSubtotal + laborTotal + tax;

  // Variants (customer facing, includes labor)
  const variants: PaymentVariant[] = [
    {
      type: 'cash',
      label: 'Cash',
      total: grandTotal,
      fee: 0,
      feePercent: 0,
    },
    {
      type: 'credit_card',
      label: 'Credit Card',
      total: grandTotal * (1 + creditCardFee),
      fee: grandTotal * creditCardFee,
      feePercent: creditCardFee * 100,
    },
    {
      type: 'financing',
      label: 'Financing',
      total: grandTotal * (1 + financingFee),
      fee: grandTotal * financingFee,
      feePercent: financingFee * 100,
    },
  ];

  // Profit calcs (labor costs subtracted from margin)
  const materialMargin = materialsSubtotal - materials.reduce((s, m) => s + m.cost * m.qty, 0);
  const grossProfit = materialMargin - laborTotal;
  const commissionRate = 0.10; // TODO: make configurable when formulas provided
  const commission = Math.max(0, grossProfit * commissionRate);
  const companyProfit = grossProfit - commission;

  return {
    materialsSubtotal,
    laborTotal,
    taxableAmount,
    tax,
    preTaxTotal,
    grandTotal,
    variants,
    grossProfit,
    commission,
    companyProfit,
    markupUsed: markup,
    taxRateUsed: taxRate,
  };
}

export function recommendLineset(
  materialCategory: string | null,
  rules: Array<{ materialCategory: string; recommendedFt: number; costPerFt: number }>,
  defaultFt = 25
): { length: number; cost: number } {
  if (!materialCategory) return { length: defaultFt, cost: 0 };
  const rule = rules.find(r => r.materialCategory.toLowerCase() === materialCategory.toLowerCase());
  if (rule) {
    return { length: rule.recommendedFt, cost: rule.recommendedFt * rule.costPerFt };
  }
  return { length: defaultFt, cost: 0 };
}
