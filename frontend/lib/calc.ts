import { EstimateMaterial, EstimateLabor } from '@/lib/shared/types';

export interface PreviewCalcInput {
  materials: EstimateMaterial[];
  labor: EstimateLabor[];
  markup?: number;
  taxRate?: number;
  creditCardFee?: number;
  financingFee?: number;
}

export interface PreviewCalcResult {
  materialsSubtotal: number;
  laborTotal: number;
  tax: number;
  grandTotal: number;
  variants: Array<{
    type: 'cash' | 'credit_card' | 'financing';
    label: string;
    total: number;
    fee: number;
  }>;
}

export function calculatePreview(input: PreviewCalcInput): PreviewCalcResult {
  const markup = input.markup ?? 0.4;
  const taxRate = input.taxRate ?? 0.06;
  const ccFee = input.creditCardFee ?? 0.03;
  const finFee = input.financingFee ?? 0.0499;

  const materialsSubtotal = (input.materials || []).reduce((sum, m) => {
    const lineTotal = m.sellingPrice ?? (m.cost * (1 + markup) * m.qty);
    return sum + lineTotal;
  }, 0);

  const laborTotal = (input.labor || []).reduce((sum, l) => {
    return sum + (l.cost ?? l.hours * l.rate);
  }, 0);

  const tax = materialsSubtotal * taxRate;
  const grandTotal = materialsSubtotal + laborTotal + tax;

  const ccLabel = `Credit Card (+${(ccFee * 100).toFixed(2)}%)`;
  const finLabel = `Financing (+${(finFee * 100).toFixed(2)}%)`;
  const variants = [
    { type: 'cash' as const, label: 'Cash', total: grandTotal, fee: 0 },
    { type: 'credit_card' as const, label: ccLabel, total: grandTotal * (1 + ccFee), fee: grandTotal * ccFee },
    { type: 'financing' as const, label: finLabel, total: grandTotal * (1 + finFee), fee: grandTotal * finFee },
  ];

  return {
    materialsSubtotal,
    laborTotal,
    tax,
    grandTotal,
    variants,
  };
}
