'use client';

import { Button } from '@/components/ui/button';
import { EstimateMaterial } from '@/lib/shared/types';

interface MaterialListProps {
  materials: EstimateMaterial[];
  onRemove: (index: number) => void;
  onUpdate?: (index: number, updates: Partial<EstimateMaterial>) => void;
  showSelling?: boolean;
  markup?: number;
}

export function MaterialList({ materials, onRemove, onUpdate, showSelling = true, markup = 0.4 }: MaterialListProps) {
  if (!materials?.length) {
    return <p className="text-sm text-muted-foreground">No materials added yet.</p>;
  }

  return (
    <div className="space-y-2">
      {materials.map((m, idx) => {
        const selling = m.sellingPrice ?? (m.cost * (1 + markup) * m.qty);
        return (
          <div key={idx} className="flex items-center justify-between border p-3 rounded text-sm bg-card">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{m.name}</div>
              <div className="text-xs text-muted-foreground">
                ${m.cost.toFixed(2)} × {m.qty}
              </div>
            </div>
            {showSelling && onUpdate && (
              <input
                type="number"
                step="0.01"
                value={selling}
                onChange={(e) => {
                  const newSell = parseFloat(e.target.value) || 0;
                  onUpdate(idx, { sellingPrice: newSell });
                }}
                className="w-20 text-right mr-3 font-semibold tabular-nums border rounded px-1"
              />
            )}
            {!onUpdate && showSelling && (
              <div className="text-right mr-3 font-semibold tabular-nums">
                ${selling.toFixed(2)}
              </div>
            )}
            <div className="flex gap-1 items-center">
              {onUpdate && (
                <input
                  type="number"
                  step="0.1"
                  value={m.qty}
                  onChange={(e) => {
                    const newQty = parseFloat(e.target.value) || 1;
                    onUpdate(idx, { qty: newQty });
                  }}
                  className="w-14 border rounded px-1"
                />
              )}
              {!onUpdate && (
                <div className="text-xs text-muted-foreground mr-1">×{m.qty}</div>
              )}
              <Button size="sm" variant="destructive" onClick={() => onRemove(idx)}>
                ×
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
