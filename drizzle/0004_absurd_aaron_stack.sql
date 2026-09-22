-- Additive-only migration for: artist profile pictures (pulled from Spotify).
-- Nothing here drops or renames an existing column, and every statement is
-- idempotent, so it's safe to run against a live database with real data,
-- any number of times.

ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "spotify_id" text;
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "image_url" text;

CREATE UNIQUE INDEX IF NOT EXISTS "artists_spotify_id_idx" ON "artists" USING btree ("spotify_id");
