-- Additive-only migration for: artists, artist ratings, lists, want-to-go,
-- notifications. Nothing here drops or renames an existing column, and every
-- statement is idempotent, so it's safe to run against a live database with
-- real data, any number of times (this matters because this project's
-- migration tracking has previously gotten out of sync with `db:push` —
-- see the README's "upgrading an existing database" note).

CREATE TABLE IF NOT EXISTS "artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"ticketmaster_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "artist_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"concert_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"note" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "want_to_go" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ticketmaster_event_id" text NOT NULL,
	"event_name" text NOT NULL,
	"event_date" date,
	"venue_name" text,
	"city" text,
	"event_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"actor_id" uuid,
	"type" text NOT NULL,
	"review_id" uuid,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- New nullable column on the existing concerts table (additive only)
ALTER TABLE "concerts" ADD COLUMN IF NOT EXISTS "artist_id" uuid;

-- Indexes
CREATE INDEX IF NOT EXISTS "artists_name_idx" ON "artists" USING btree ("name");
CREATE UNIQUE INDEX IF NOT EXISTS "artists_ticketmaster_id_idx" ON "artists" USING btree ("ticketmaster_id");
CREATE UNIQUE INDEX IF NOT EXISTS "artist_ratings_user_artist_idx" ON "artist_ratings" USING btree ("user_id","artist_id");
CREATE INDEX IF NOT EXISTS "artist_ratings_artist_idx" ON "artist_ratings" USING btree ("artist_id");
CREATE INDEX IF NOT EXISTS "lists_user_idx" ON "lists" USING btree ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "list_items_list_concert_idx" ON "list_items" USING btree ("list_id","concert_id");
CREATE INDEX IF NOT EXISTS "list_items_list_idx" ON "list_items" USING btree ("list_id");
CREATE UNIQUE INDEX IF NOT EXISTS "want_to_go_user_event_idx" ON "want_to_go" USING btree ("user_id","ticketmaster_event_id");
CREATE INDEX IF NOT EXISTS "want_to_go_user_idx" ON "want_to_go" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","is_read");
CREATE INDEX IF NOT EXISTS "concerts_artist_id_idx" ON "concerts" USING btree ("artist_id");

-- Foreign keys (skip if they already exist)
DO $$ BEGIN
  ALTER TABLE "artist_ratings" ADD CONSTRAINT "artist_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "artist_ratings" ADD CONSTRAINT "artist_ratings_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lists" ADD CONSTRAINT "lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "list_items" ADD CONSTRAINT "list_items_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "list_items" ADD CONSTRAINT "list_items_concert_id_concerts_id_fk" FOREIGN KEY ("concert_id") REFERENCES "public"."concerts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "want_to_go" ADD CONSTRAINT "want_to_go_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "concerts" ADD CONSTRAINT "concerts_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill: create one artist row per distinct artist name already logged,
-- and point existing concerts at it. Safe to re-run — only fills rows still
-- missing an artist_id.
INSERT INTO artists (name)
SELECT DISTINCT artist FROM concerts
WHERE artist_id IS NULL
ON CONFLICT DO NOTHING;

UPDATE concerts c
SET artist_id = a.id
FROM artists a
WHERE c.artist_id IS NULL
  AND lower(a.name) = lower(c.artist);
