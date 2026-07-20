'use client';

import { Button } from '@/components/ui/button';
import { EstimateMaterial } from '@shared/types';

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
            {showSelling && (
              <div className="text-right mr-3 font-semibold tabular-nums">
                ${selling.toFixed(2)}
              </div>
            )}
            <div className="flex gap-1">
              {onUpdate && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const newQty = parseFloat(prompt('New quantity?', String(m.qty)) || String(m.qty));
                    if (!isNaN(newQty)) onUpdate(idx, { qty: newQty });
                  }}
                >
                  Edit
                </Button>
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
