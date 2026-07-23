-- Full multi-tenancy migration SQL for Neon (safe to run multiple times)
-- Run this in Neon SQL editor before or with the code deploy.
-- It creates companies, adds company_id columns, backfills, updates uniques and FKs.
-- After, HCP keys are per company (re-save one via admin if needed).

-- Companies
CREATE TABLE IF NOT EXISTS "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hcp_api_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add columns
DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "company_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "company_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "pricebook_items" ADD COLUMN IF NOT EXISTS "company_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "hcp_estimates" ADD COLUMN IF NOT EXISTS "company_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "install_rules" ADD COLUMN IF NOT EXISTS "company_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "lineset_rules" ADD COLUMN IF NOT EXISTS "company_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "estimates" ADD COLUMN IF NOT EXISTS "company_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- Backfill default company + data
INSERT INTO "companies" ("name") VALUES ('Default Company') ON CONFLICT DO NOTHING;

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
    UPDATE companies SET hcp_api_key = (
      SELECT hcp_api_key FROM users WHERE hcp_api_key IS NOT NULL AND company_id = default_company_id LIMIT 1
    ) WHERE id = default_company_id AND hcp_api_key IS NULL;
    -- Bootstrap: make the first user an admin for the default company
    UPDATE users SET role = 'admin' 
    WHERE id = (SELECT id FROM users ORDER BY id LIMIT 1) 
      AND role <> 'admin';
  END IF;
END $$;

-- Uniques
DO $$ BEGIN
  ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_key_unique;
EXCEPTION WHEN undefined_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE settings ADD CONSTRAINT IF NOT EXISTS settings_company_key_unique UNIQUE (company_id, key);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE pricebook_items DROP CONSTRAINT IF EXISTS pricebook_items_hcp_id_unique;
EXCEPTION WHEN undefined_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE pricebook_items ADD CONSTRAINT IF NOT EXISTS pricebook_items_company_hcp_unique UNIQUE (company_id, hcp_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE hcp_estimates DROP CONSTRAINT IF EXISTS hcp_estimates_hcp_id_unique;
EXCEPTION WHEN undefined_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE install_rules DROP CONSTRAINT IF EXISTS install_rules_equipment_type_unique;
EXCEPTION WHEN undefined_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE install_rules ADD CONSTRAINT IF NOT EXISTS install_rules_company_equipment_unique UNIQUE (company_id, equipment_type);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE lineset_rules DROP CONSTRAINT IF EXISTS lineset_rules_material_category_unique;
EXCEPTION WHEN undefined_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE lineset_rules ADD CONSTRAINT IF NOT EXISTS lineset_rules_company_category_unique UNIQUE (company_id, material_category);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- FKs
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE settings ADD CONSTRAINT IF NOT EXISTS settings_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE pricebook_items ADD CONSTRAINT IF NOT EXISTS pricebook_items_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE hcp_estimates ADD CONSTRAINT IF NOT EXISTS hcp_estimates_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE install_rules ADD CONSTRAINT IF NOT EXISTS install_rules_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE lineset_rules ADD CONSTRAINT IF NOT EXISTS lineset_rules_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE estimates ADD CONSTRAINT IF NOT EXISTS estimates_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Note: after running, re-save HCP key in Admin (now company level)
-- Run the app to apply any remaining embedded migration.
