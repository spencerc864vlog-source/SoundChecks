CREATE TABLE "venue_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"country" text NOT NULL,
	"address" text,
	"ticketmaster_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "concerts" ADD COLUMN "venue_id" uuid;--> statement-breakpoint
-- setlistfm_id already exists on databases that were set up via `db:push`
-- during earlier development; IF NOT EXISTS makes this safe either way.
ALTER TABLE "concerts" ADD COLUMN IF NOT EXISTS "setlistfm_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "concerts_setlistfm_id_idx" ON "concerts" USING btree ("setlistfm_id");--> statement-breakpoint
ALTER TABLE "venue_ratings" ADD CONSTRAINT "venue_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_ratings" ADD CONSTRAINT "venue_ratings_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "venue_ratings_user_venue_idx" ON "venue_ratings" USING btree ("user_id","venue_id");--> statement-breakpoint
CREATE INDEX "venue_ratings_venue_idx" ON "venue_ratings" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "venues_name_idx" ON "venues" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "venues_ticketmaster_id_idx" ON "venues" USING btree ("ticketmaster_id");--> statement-breakpoint
ALTER TABLE "concerts" ADD CONSTRAINT "concerts_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "concerts_venue_idx" ON "concerts" USING btree ("venue_id");