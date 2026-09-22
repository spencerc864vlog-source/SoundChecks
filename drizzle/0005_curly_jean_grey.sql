-- Migration for: account deletion. Makes concerts.created_by_user_id
-- nullable and switches its delete behavior from CASCADE to SET NULL, so
-- deleting a user's account no longer takes their logged shows (and
-- everyone else's reviews/lists/top-four entries tied to those shows) down
-- with it — only the "who added this" attribution is cleared. Safe to
-- re-run any number of times.

ALTER TABLE "concerts" DROP CONSTRAINT IF EXISTS "concerts_created_by_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "concerts" ALTER COLUMN "created_by_user_id" DROP NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "concerts" ADD CONSTRAINT "concerts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
