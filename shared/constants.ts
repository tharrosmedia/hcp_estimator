export const DEFAULT_MARKUP = 0.40; // 40% - but use from settings
export const DEFAULT_TAX_RATE = 0.06; // 6% MD

export const PAYMENT_TYPES = ['cash', 'credit_card', 'financing'] as const;

export const ROLES: Record<string, string> = {
  sales: 'Sales',
  manager: 'Manager',
  admin: 'Admin',
};

export const ESTIMATE_STATUSES = ['draft', 'pending_approval', 'approved', 'pushed_to_hcp', 'archived'] as const;

export const HCP_BASE_URL = 'https://api.housecallpro.com';

export const APP_NAME = 'HCP Estimator';
