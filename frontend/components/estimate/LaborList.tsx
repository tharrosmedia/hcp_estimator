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
              <span className="font-medium">{l.task}</span>
              {onUpdate ? '' : ` — ${l.hours}h @ ${l.rate}`}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tabular-nums">${cost.toFixed(2)}</span>
              <div className="flex gap-1 items-center">
                {onUpdate && (
                  <>
                    <input
                      type="number"
                      step="0.1"
                      value={l.hours}
                      onChange={(e) => {
                        const newHrs = parseFloat(e.target.value) || 0;
                        onUpdate(idx, { hours: newHrs });
                      }}
                      className="w-12 border rounded px-1"
                    />
                    <span>@</span>
                    <input
                      type="number"
                      step="0.01"
                      value={l.rate}
                      onChange={(e) => {
                        const newRate = parseFloat(e.target.value) || 0;
                        onUpdate(idx, { rate: newRate });
                      }}
                      className="w-14 border rounded px-1"
                    />
                  </>
                )}
                {!onUpdate && (
                  <span>{l.hours}h @ ${l.rate}</span>
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
