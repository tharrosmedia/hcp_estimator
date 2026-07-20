'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PricebookItem } from '@shared/types';

interface PricebookPickerProps {
  pricebook: any[];
  onSelect: (item: Partial<PricebookItem> & { cost: number; name: string }) => void;
  onCustomAdd: (name: string, cost: number, qty: number) => void;
}

export function PricebookPicker({ pricebook, onSelect, onCustomAdd }: PricebookPickerProps) {
  const [search, setSearch] = useState('');
  const [customName, setCustomName] = useState('');
  const [customCost, setCustomCost] = useState(0);
  const [customQty, setCustomQty] = useState(1);

  const filtered = pricebook
    .filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 8);

  return (
    <div className="space-y-4">
      <div>
        <Input
          placeholder="Search pricebook..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
        />
        {search && filtered.length > 0 && (
          <div className="border rounded max-h-40 overflow-auto text-sm">
            {filtered.map((item: any, i: number) => (
              <div
                key={i}
                onClick={() => {
                  onSelect({ ...item, cost: item.cost });
                  setSearch('');
                }}
                className="p-2 hover:bg-muted cursor-pointer flex justify-between"
              >
                <span>{item.name}</span>
                <span className="text-muted-foreground">${item.cost}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <div className="text-sm font-medium mb-2">Or add custom item</div>
        <div className="flex gap-2">
          <Input
            placeholder="Item name"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="flex-1"
          />
          <Input
            type="number"
            placeholder="Cost"
            value={customCost}
            onChange={(e) => setCustomCost(parseFloat(e.target.value) || 0)}
            className="w-24"
          />
          <Input
            type="number"
            placeholder="Qty"
            value={customQty}
            onChange={(e) => setCustomQty(parseFloat(e.target.value) || 1)}
            className="w-16"
          />
          <Button
            onClick={() => {
              if (customName && customCost > 0) {
                onCustomAdd(customName, customCost, customQty);
                setCustomName('');
                setCustomCost(0);
                setCustomQty(1);
              }
            }}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
