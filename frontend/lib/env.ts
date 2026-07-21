export const env = {
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  HCP_BASE_URL: process.env.HCP_BASE_URL || 'https://api.housecallpro.com',
  // For dev magic link bypass
  DEV_BYPASS: process.env.DEV_BYPASS === 'true',
};
