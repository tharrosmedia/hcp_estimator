'use client';

import { Input } from '@/components/ui/input';

interface CustomerFormProps {
  values: {
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    jobAddress?: string;
    hcpJobId?: string;
  };
  onChange: (field: string, value: string) => void;
}

export function CustomerForm({ values, onChange }: CustomerFormProps) {
  return (
    <div className="space-y-4">
      <Input
        placeholder="Customer Name *"
        value={values.customerName}
        onChange={(e) => onChange('customerName', e.target.value)}
        className="text-lg py-6"
        required
      />
      <Input
        placeholder="Email"
        type="email"
        value={values.customerEmail || ''}
        onChange={(e) => onChange('customerEmail', e.target.value)}
      />
      <Input
        placeholder="Phone"
        value={values.customerPhone || ''}
        onChange={(e) => onChange('customerPhone', e.target.value)}
      />
      <Input
        placeholder="Job Address / Site Notes"
        value={values.jobAddress || ''}
        onChange={(e) => onChange('jobAddress', e.target.value)}
      />
    </div>
  );
}
