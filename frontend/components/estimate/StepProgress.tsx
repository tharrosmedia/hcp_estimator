'use client';

import { cn } from '@/lib/utils';

interface StepProgressProps {
  current: number;
  total: number;
  onStepClick?: (step: number) => void;
}

export function StepProgress({ current, total, onStepClick }: StepProgressProps) {
  return (
    <div className="flex gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => i + 1).map((s) => (
        <div
          key={s}
          onClick={() => onStepClick?.(s)}
          className={cn(
            'h-2 flex-1 rounded-full transition-all cursor-pointer',
            s <= current ? 'bg-primary' : 'bg-muted',
            onStepClick && 'hover:opacity-80'
          )}
          aria-label={`Go to step ${s}`}
        />
      ))}
    </div>
  );
}
