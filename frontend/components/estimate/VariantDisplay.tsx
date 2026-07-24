'use client';

import { Card, CardContent } from '@/components/ui/card';

interface Variant {
  type: string;
  label: string;
  total: number;
  fee: number;
}

interface VariantDisplayProps {
  variants: Variant[];
  grandTotal: number;
  selectedType?: string;
  onSelect?: (type: string) => void;
}

export function VariantDisplay({ variants, grandTotal, selectedType, onSelect }: VariantDisplayProps) {
  return (
    <div className="mt-6">
      <h4 className="font-semibold mb-2">Customer Payment Options (click to choose what to send)</h4>
      <div className="grid grid-cols-1 gap-3">
        {variants.map((v, i) => {
          const isSelected = selectedType === v.type;
          return (
            <Card 
              key={i} 
              className={`border cursor-pointer transition ${isSelected ? 'border-primary ring-2 ring-primary' : 'hover:border-muted-foreground/50'}`}
              onClick={() => onSelect?.(v.type)}
            >
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {v.label}
                    {isSelected && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground">SELECTED</span>}
                  </div>
                  {v.fee > 0 && (
                    <div className="text-xs text-muted-foreground">+${v.fee.toFixed(2)} fee</div>
                  )}
                </div>
                <div className="text-2xl font-semibold tabular-nums">${v.total.toFixed(2)}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="mt-3 text-xs text-muted-foreground text-center">
        Base (materials + labor + tax): ${grandTotal.toFixed(2)}
      </div>
    </div>
  );
}
