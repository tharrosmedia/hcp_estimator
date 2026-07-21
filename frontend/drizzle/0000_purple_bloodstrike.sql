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
	"equipment_type" text NOT NULL,
	"base_hours" real NOT NULL,
	"crew_multiplier" real DEFAULT 1 NOT NULL,
	"notes" text,
	CONSTRAINT "install_rules_equipment_type_unique" UNIQUE("equipment_type")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lineset_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"material_category" text NOT NULL,
	"recommended_ft" real NOT NULL,
	"cost_per_ft" real NOT NULL,
	CONSTRAINT "lineset_rules_material_category_unique" UNIQUE("material_category")
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
	"hcp_id" text,
	"name" text NOT NULL,
	"description" text,
	"cost" real NOT NULL,
	"category" text,
	"unit" text,
	"lineset_ft" real,
	"lineset_cost" real,
	"last_synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pricebook_items_hcp_id_unique" UNIQUE("hcp_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" text DEFAULT 'sales' NOT NULL,
	"hcp_api_key" text,
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
