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
}

export function VariantDisplay({ variants, grandTotal }: VariantDisplayProps) {
  return (
    <div className="mt-6">
      <h4 className="font-semibold mb-2">Customer Payment Options</h4>
      <div className="grid grid-cols-1 gap-3">
        {variants.map((v, i) => (
          <Card key={i} className="border">
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <div className="font-medium">{v.label}</div>
                {v.fee > 0 && (
                  <div className="text-xs text-muted-foreground">+${v.fee.toFixed(2)} fee</div>
                )}
              </div>
              <div className="text-2xl font-semibold tabular-nums">${v.total.toFixed(2)}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-3 text-xs text-muted-foreground text-center">
        Base (materials + tax): ${grandTotal.toFixed(2)} — labor is internal only
      </div>
    </div>
  );
}
