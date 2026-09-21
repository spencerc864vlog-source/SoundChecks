ALTER TABLE "concerts" ALTER COLUMN "venue_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "concerts" DROP COLUMN "venue";--> statement-breakpoint
ALTER TABLE "concerts" DROP COLUMN "city";--> statement-breakpoint
ALTER TABLE "concerts" DROP COLUMN "country";