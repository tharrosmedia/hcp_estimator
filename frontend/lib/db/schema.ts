import { pgTable, serial, text, integer, real, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role').notNull().default('sales'), // sales | manager | admin
  hcpApiKey: text('hcp_api_key'), // store encrypted in real prod
  markupOverride: real('markup_override'), // e.g. 0.40
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const pricebookItems = pgTable('pricebook_items', {
  id: serial('id').primaryKey(),
  hcpId: text('hcp_id').unique(),
  name: text('name').notNull(),
  description: text('description'),
  cost: real('cost').notNull(),
  category: text('category'),
  unit: text('unit'),
  linesetFt: real('lineset_ft'),
  linesetCost: real('lineset_cost'),
  lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(),
});

export const installRules = pgTable('install_rules', {
  id: serial('id').primaryKey(),
  equipmentType: text('equipment_type').notNull().unique(),
  baseHours: real('base_hours').notNull(),
  crewMultiplier: real('crew_multiplier').notNull().default(1),
  notes: text('notes'),
});

export const linesetRules = pgTable('lineset_rules', {
  id: serial('id').primaryKey(),
  materialCategory: text('material_category').notNull().unique(),
  recommendedFt: real('recommended_ft').notNull(),
  costPerFt: real('cost_per_ft').notNull(),
});

export const estimates = pgTable('estimates', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email'),
  customerPhone: text('customer_phone'),
  jobAddress: text('job_address'),
  jobNotes: text('job_notes'),
  markup: real('markup').notNull(),
  taxRate: real('tax_rate').notNull(),
  status: text('status').notNull().default('draft'),
  hcpEstimateId: text('hcp_estimate_id'),
  hcpJobId: text('hcp_job_id'),
  approvalFlag: boolean('approval_flag').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const estimateMaterials = pgTable('estimate_materials', {
  id: serial('id').primaryKey(),
  estimateId: integer('estimate_id').notNull().references(() => estimates.id, { onDelete: 'cascade' }),
  pricebookItemId: integer('pricebook_item_id').references(() => pricebookItems.id),
  name: text('name').notNull(),
  description: text('description'),
  cost: real('cost').notNull(),
  qty: real('qty').notNull(),
  markup: real('markup').notNull(),
  sellingPrice: real('selling_price').notNull(),
});

export const estimateLabor = pgTable('estimate_labor', {
  id: serial('id').primaryKey(),
  estimateId: integer('estimate_id').notNull().references(() => estimates.id, { onDelete: 'cascade' }),
  task: text('task').notNull(),
  hours: real('hours').notNull(),
  rate: real('rate').notNull(),
  cost: real('cost').notNull(),
  notes: text('notes'),
});

// For magic tokens (simple in-memory for MVP, or table for prod)
export const magicTokens = pgTable('magic_tokens', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
