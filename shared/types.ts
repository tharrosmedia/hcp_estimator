// Shared types for HCP Estimator
// Used by both frontend and backend

export type UserRole = 'sales' | 'manager' | 'admin';

export interface User {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
  hcpApiKey: string | null; // encrypted at rest in prod
  markupOverride: number | null; // e.g. 0.4 for 40%
  createdAt: string;
  updatedAt: string;
}

export interface PricebookItem {
  id: number;
  hcpId: string | null;
  name: string;
  description: string | null;
  cost: number; // unit cost
  category: string | null;
  unit: string | null;
  linesetFt: number | null;
  linesetCost: number | null;
  lastSyncedAt: string | Date;
}

export interface GlobalSetting {
  id: number;
  key: string;
  value: string; // stored as string, parse as needed (number, bool, json)
  updatedAt: string;
}

export interface InstallRule {
  id: number;
  equipmentType: string;
  baseHours: number;
  crewMultiplier: number;
  notes: string | null;
}

export interface LinesetRule {
  id: number;
  materialCategory: string;
  recommendedFt: number;
  costPerFt: number;
}

export interface EstimateMaterial {
  id?: number;
  pricebookItemId?: number | null;
  name: string;
  description?: string | null;
  cost: number;
  qty: number;
  markup: number; // decimal e.g. 0.4
  sellingPrice: number; // computed
}

export interface EstimateLabor {
  id?: number;
  task: string;
  hours: number;
  rate: number; // internal labor rate at time
  cost: number; // computed
  notes?: string | null;
}

export type EstimateStatus = 'draft' | 'pending_approval' | 'approved' | 'pushed_to_hcp' | 'archived';

export interface Estimate {
  id: number;
  userId: number;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  jobAddress?: string | null;
  jobNotes?: string | null;
  markup: number; // per-estimate override
  taxRate: number;
  status: EstimateStatus;
  hcpEstimateId?: string | null;
  hcpJobId?: string | null;
  approvalFlag: boolean; // manager approval
  createdAt: string;
  updatedAt: string;
  materials: EstimateMaterial[];
  labor: EstimateLabor[];
}

export interface PaymentVariant {
  type: 'cash' | 'credit_card' | 'financing';
  label: string;
  total: number;
  fee: number;
  feePercent: number;
}

export interface CalcResult {
  materialsSubtotal: number;
  laborTotal: number; // internal
  taxableAmount: number;
  tax: number;
  preTaxTotal: number;
  grandTotal: number;
  variants: PaymentVariant[];
  grossProfit: number;
  commission: number;
  companyProfit: number;
  markupUsed: number;
  taxRateUsed: number;
}

export interface HcpPricebookItemRaw {
  id: string;
  name: string;
  description?: string;
  unit_cost: string | number;
  category?: string;
  // extend as needed from HCP response
}

export interface CreateEstimatePayload {
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
  jobAddress?: string;
  notes?: string;
  materials: Array<{
    name: string;
    description?: string;
    unitPrice: number;
    quantity: number;
  }>;
}

export interface AuthTokenPayload {
  userId: number;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export type MagicToken = string; // short lived for passwordless
