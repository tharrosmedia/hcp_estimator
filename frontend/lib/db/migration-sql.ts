export const migration0000 = `
CREATE TABLE IF NOT EXISTS "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hcp_api_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
 --> statement-breakpoint
CREATE TABLE IF NOT EXISTS "estimate_labor" (
	"id" serial PRIMARY KEY NOT NULL,
	"estimate_id" integer NOT NULL,
	"task" text NOT NULL,
	"hours" real NOT NULL,
	"rate" real NOT NULL,
	"cost" real NOT NULL,
	"notes" text
);
 --> statement-breakpoint
CREATE TABLE IF NOT EXISTS "estimate_materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"estimate_id" integer NOT NULL,
	"pricebook_item_id" integer,
	"name" text NOT NULL,
	"description" text,
	"cost" real NOT NULL,
	"qty" real NOT NULL,
	"markup" real NOT NULL,
	"selling_price" real NOT NULL
);
 --> statement-breakpoint
CREATE TABLE IF NOT EXISTS "estimates" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_phone" text,
	"job_address" text,
	"job_notes" text,
	"markup" real NOT NULL,
	"tax_rate" real NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"hcp_estimate_id" text,
	"hcp_job_id" text,
	"approval_flag" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
 --> statement-breakpoint
CREATE TABLE IF NOT EXISTS "install_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"equipment_type" text NOT NULL,
	"base_hours" real NOT NULL,
	"crew_multiplier" real DEFAULT 1 NOT NULL,
	"notes" text
);
 --> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lineset_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"material_category" text NOT NULL,
	"recommended_ft" real NOT NULL,
	"cost_per_ft" real NOT NULL
);
 --> statement-breakpoint
CREATE TABLE IF NOT EXISTS "magic_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "magic_tokens_token_unique" UNIQUE("token")
);
 --> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pricebook_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"hcp_id" text,
	"name" text NOT NULL,
	"description" text,
	"cost" real NOT NULL,
	"category" text,
	"unit" text,
	"lineset_ft" real,
	"lineset_cost" real,
	"last_synced_at" timestamp DEFAULT now() NOT NULL
);
  --> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hcp_estimates" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"hcp_id" text NOT NULL,
	"estimate_number" text,
	"work_status" text,
	"customer_name" text,
	"customer_email" text,
	"customer_phone" text,
	"address" text,
	"scheduled_start" timestamp,
	"scheduled_end" timestamp,
	"status" text,
	"notes" text,
	"last_synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hcp_estimates_company_hcp_unique" UNIQUE ("company_id", "hcp_id")
);
  --> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
 --> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" text DEFAULT 'sales' NOT NULL,
	"company_id" integer,
	"markup_override" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
 --> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "estimate_labor" ADD CONSTRAINT "estimate_labor_estimate_id_estimates_id_fk" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "estimate_materials" ADD CONSTRAINT "estimate_materials_estimate_id_estimates_id_fk" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "estimate_materials" ADD CONSTRAINT "estimate_materials_pricebook_item_id_pricebook_items_id_fk" FOREIGN KEY ("pricebook_item_id") REFERENCES "public"."pricebook_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "estimates" ADD CONSTRAINT "estimates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
 --> statement-breakpoint

-- Companies and multi-tenancy additions (idempotent)
CREATE TABLE IF NOT EXISTS "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hcp_api_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
 --> statement-breakpoint

-- Add company_id columns if not present (use DO for safety)
DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "company_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;
 --> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "settings" ADD COLUMN "company_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;
 --> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "pricebook_items" ADD COLUMN "company_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;
 --> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "hcp_estimates" ADD COLUMN "company_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;
 --> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "install_rules" ADD COLUMN "company_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;
 --> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "lineset_rules" ADD COLUMN "company_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;
 --> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "estimates" ADD COLUMN "company_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;
 --> statement-breakpoint

-- Backfill default company and assign data (run once)
INSERT INTO "companies" ("name") VALUES ('Default Company')
ON CONFLICT DO NOTHING;
 --> statement-breakpoint

-- Assign to default company (assumes company id 1 or first)
DO $$
DECLARE
  default_company_id integer;
BEGIN
  SELECT id INTO default_company_id FROM companies ORDER BY id LIMIT 1;
  IF default_company_id IS NOT NULL THEN
    UPDATE users SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE settings SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE pricebook_items SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE hcp_estimates SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE install_rules SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE lineset_rules SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE estimates SET company_id = default_company_id WHERE company_id IS NULL;
    -- Copy first available hcp key to company if none
    UPDATE companies SET hcp_api_key = (
      SELECT hcp_api_key FROM users WHERE hcp_api_key IS NOT NULL AND company_id = default_company_id LIMIT 1
    ) WHERE id = default_company_id AND hcp_api_key IS NULL;
    -- Bootstrap: make the first user an admin for the default company
    UPDATE users SET role = 'admin' 
    WHERE id = (SELECT id FROM users ORDER BY id LIMIT 1) 
      AND role <> 'admin';
  END IF;
END $$;
 --> statement-breakpoint

-- Drop old uniques and add new company-scoped ones
DO $$ BEGIN
  ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_key_unique;
EXCEPTION WHEN undefined_object THEN null; END $$;
 --> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE settings ADD CONSTRAINT settings_company_key_unique UNIQUE (company_id, key);
EXCEPTION WHEN duplicate_object THEN null; END $$;
 --> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE pricebook_items DROP CONSTRAINT IF EXISTS pricebook_items_hcp_id_unique;
EXCEPTION WHEN undefined_object THEN null; END $$;
 --> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE pricebook_items ADD CONSTRAINT pricebook_items_company_hcp_unique UNIQUE (company_id, hcp_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;
 --> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE hcp_estimates DROP CONSTRAINT IF EXISTS hcp_estimates_hcp_id_unique;
EXCEPTION WHEN undefined_object THEN null; END $$;
  --> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE hcp_estimates ADD CONSTRAINT hcp_estimates_company_hcp_unique UNIQUE (company_id, hcp_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;
  --> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE install_rules DROP CONSTRAINT IF EXISTS install_rules_equipment_type_unique;
EXCEPTION WHEN undefined_object THEN null; END $$;

 --> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE install_rules ADD CONSTRAINT install_rules_company_equipment_unique UNIQUE (company_id, equipment_type);
EXCEPTION WHEN duplicate_object THEN null; END $$;
 --> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE lineset_rules DROP CONSTRAINT IF EXISTS lineset_rules_material_category_unique;
EXCEPTION WHEN undefined_object THEN null; END $$;
 --> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE lineset_rules ADD CONSTRAINT lineset_rules_company_category_unique UNIQUE (company_id, material_category);
EXCEPTION WHEN duplicate_object THEN null; END $$;
 --> statement-breakpoint

-- Add FKs for company_id
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
 --> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE settings ADD CONSTRAINT settings_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
 --> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE pricebook_items ADD CONSTRAINT pricebook_items_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
 --> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE hcp_estimates ADD CONSTRAINT hcp_estimates_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
 --> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE install_rules ADD CONSTRAINT install_rules_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
 --> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE lineset_rules ADD CONSTRAINT lineset_rules_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
 --> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE estimates ADD CONSTRAINT estimates_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
 --> statement-breakpoint

-- Add company FK for estimates user if needed (already there)
 `.trim();

