-- Create quality_control_checks table
CREATE TABLE IF NOT EXISTS "quality_control_checks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" varchar NOT NULL,
	"reviewed_by" varchar NOT NULL,
	"checklist_items" jsonb DEFAULT '[]' NOT NULL,
	"overall_rating" integer NOT NULL,
	"compliance_score" integer NOT NULL,
	"passed" boolean DEFAULT false NOT NULL,
	"comments" text,
	"photos" jsonb DEFAULT '[]',
	"review_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "quality_control_checks" ADD CONSTRAINT "quality_control_checks_request_id_maintenance_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "maintenance_requests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "quality_control_checks" ADD CONSTRAINT "quality_control_checks_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS "quality_control_checks_request_id_idx" ON "quality_control_checks" ("request_id");
CREATE INDEX IF NOT EXISTS "quality_control_checks_reviewed_by_idx" ON "quality_control_checks" ("reviewed_by");
CREATE INDEX IF NOT EXISTS "quality_control_checks_passed_idx" ON "quality_control_checks" ("passed");
CREATE INDEX IF NOT EXISTS "quality_control_checks_review_date_idx" ON "quality_control_checks" ("review_date");

-- Add new status values to maintenance requests if not already present
-- Note: This assumes the status column allows these values, adjust as needed
-- UPDATE maintenance_requests SET status = 'quality_approved' WHERE status = 'quality_approved';
-- UPDATE maintenance_requests SET status = 'quality_rejected' WHERE status = 'quality_rejected';
-- UPDATE maintenance_requests SET status = 'rework_required' WHERE status = 'rework_required';