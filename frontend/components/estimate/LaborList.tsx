'use client';

import { Button } from '@/components/ui/button';
import { EstimateLabor } from '@/lib/shared/types';

interface LaborListProps {
  labor: EstimateLabor[];
  onRemove: (index: number) => void;
  onUpdate?: (index: number, updates: Partial<EstimateLabor>) => void;
}

export function LaborList({ labor, onRemove, onUpdate }: LaborListProps) {
  if (!labor?.length) {
    return <p className="text-sm text-muted-foreground">No labor added yet.</p>;
  }

  return (
    <div className="space-y-2 text-sm">
      {labor.map((l, idx) => {
        const cost = l.cost ?? l.hours * l.rate;
        return (
          <div key={idx} className="flex items-center justify-between border p-3 rounded bg-muted">
            <div>
              <span className="font-medium">{l.task}</span> — {l.hours}h @ ${l.rate}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tabular-nums">${cost.toFixed(2)}</span>
              <div className="flex gap-1">
                {onUpdate && (
                  <Button size="sm" variant="ghost" onClick={() => {
                    const newHrs = parseFloat(prompt('Hours?', String(l.hours)) || String(l.hours));
                    if (!isNaN(newHrs)) onUpdate(idx, { hours: newHrs });
                  }}>Edit</Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => onRemove(idx)}>×</Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
