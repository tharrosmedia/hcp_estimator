import { env } from './env';

export const HCP_BASE_URL = env.HCP_BASE_URL;

export const DEFAULT_SETTINGS = {
  markup: '0.40',
  tax_rate: '0.06',
  labor_rate: '75', // configurable only
  crew_size: '2',
  gas_price: '3.50',
  financing_fee: '0.0499',
  cron_schedule: '0 6 * * *', // daily 6am
};

export const TOKEN_EXPIRY = {
  access: env.JWT_EXPIRES_IN,
  refresh: env.JWT_REFRESH_EXPIRES_IN,
};
