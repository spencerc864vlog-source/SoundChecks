import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  uniqueIndex,
  index,
  date,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio").default("").notNull(),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_username_idx").on(table.username),
    uniqueIndex("users_email_idx").on(table.email),
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  concertsAdded: many(concerts),
  reviews: many(reviews),
  venueRatings: many(venueRatings),
  topFour: many(topFour),
  following: many(follows, { relationName: "follower" }),
  followers: many(follows, { relationName: "following" }),
  likes: many(likes),
  comments: many(comments),
}));

// ---------------------------------------------------------------------------
// Venues
// ---------------------------------------------------------------------------
export const venues = pgTable(
  "venues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    city: text("city").notNull(),
    country: text("country").notNull(),
    address: text("address"),
    // Set once we've matched this venue to a Ticketmaster venue, so we can
    // look up upcoming shows there without re-searching every time.
    ticketmasterId: text("ticketmaster_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("venues_name_idx").on(table.name),
    uniqueIndex("venues_ticketmaster_id_idx").on(table.ticketmasterId),
  ]
);

export const venuesRelations = relations(venues, ({ many }) => ({
  concerts: many(concerts),
  ratings: many(venueRatings),
}));

// ---------------------------------------------------------------------------
// Venue ratings (a rating + optional write-up for one user, for one venue —
// separate from concert reviews, e.g. "great sound, terrible parking")
// ---------------------------------------------------------------------------
export const venueRatings = pgTable(
  "venue_ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    // Rating stored in half-point units, 1-10 => 0.5-5.0 stars (same scale as reviews)
    rating: integer("rating").notNull(),
    body: text("body").default("").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("venue_ratings_user_venue_idx").on(table.userId, table.venueId),
    index("venue_ratings_venue_idx").on(table.venueId),
  ]
);

export const venueRatingsRelations = relations(venueRatings, ({ one }) => ({
  user: one(users, { fields: [venueRatings.userId], references: [users.id] }),
  venue: one(venues, { fields: [venueRatings.venueId], references: [venues.id] }),
}));

// ---------------------------------------------------------------------------
// Concerts
// ---------------------------------------------------------------------------
export const concerts = pgTable(
  "concerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    artist: text("artist").notNull(),
    tourName: text("tour_name"),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "restrict" }),
    date: date("date").notNull(),
    posterUrl: text("poster_url"),
    // Set when this concert was imported from setlist.fm's database, so we
    // can look it up again instead of creating a duplicate row. Null for
    // shows added manually (setlist.fm doesn't have everything).
    setlistfmId: text("setlistfm_id"),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("concerts_artist_idx").on(table.artist),
    index("concerts_date_idx").on(table.date),
    index("concerts_venue_idx").on(table.venueId),
    uniqueIndex("concerts_setlistfm_id_idx").on(table.setlistfmId),
  ]
);

export const concertsRelations = relations(concerts, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [concerts.createdByUserId],
    references: [users.id],
  }),
  venue: one(venues, {
    fields: [concerts.venueId],
    references: [venues.id],
  }),
  reviews: many(reviews),
  topFourEntries: many(topFour),
}));

// ---------------------------------------------------------------------------
// Reviews (a rating + optional write-up for one user attending one concert)
// ---------------------------------------------------------------------------
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    concertId: uuid("concert_id")
      .notNull()
      .references(() => concerts.id, { onDelete: "cascade" }),
    // Rating stored in half-point units, 1-10 => 0.5-5.0 stars
    rating: integer("rating").notNull(),
    body: text("body").default("").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("reviews_user_concert_idx").on(table.userId, table.concertId),
    index("reviews_concert_idx").on(table.concertId),
    index("reviews_user_idx").on(table.userId),
    index("reviews_created_at_idx").on(table.createdAt),
  ]
);

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  concert: one(concerts, { fields: [reviews.concertId], references: [concerts.id] }),
  media: many(reviewMedia),
  likes: many(likes),
  comments: many(comments),
}));

// ---------------------------------------------------------------------------
// Review media (photos / video clips attached to a review)
// ---------------------------------------------------------------------------
export const reviewMedia = pgTable(
  "review_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    type: text("type", { enum: ["photo", "video"] }).notNull(),
    position: integer("position").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("review_media_review_idx").on(table.reviewId)]
);

export const reviewMediaRelations = relations(reviewMedia, ({ one }) => ({
  review: one(reviews, { fields: [reviewMedia.reviewId], references: [reviews.id] }),
}));

// ---------------------------------------------------------------------------
// Top Four (Letterboxd-style four favorite concerts pinned to a profile)
// ---------------------------------------------------------------------------
export const topFour = pgTable(
  "top_four",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    concertId: uuid("concert_id")
      .notNull()
      .references(() => concerts.id, { onDelete: "cascade" }),
    position: integer("position").notNull(), // 1-4
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("top_four_user_position_idx").on(table.userId, table.position),
    uniqueIndex("top_four_user_concert_idx").on(table.userId, table.concertId),
  ]
);

export const topFourRelations = relations(topFour, ({ one }) => ({
  user: one(users, { fields: [topFour.userId], references: [users.id] }),
  concert: one(concerts, { fields: [topFour.concertId], references: [concerts.id] }),
}));

// ---------------------------------------------------------------------------
// Follows (social graph)
// ---------------------------------------------------------------------------
export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followingId] }),
    index("follows_following_idx").on(table.followingId),
  ]
);

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "follower",
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: "following",
  }),
}));

// ---------------------------------------------------------------------------
// Likes (on reviews)
// ---------------------------------------------------------------------------
export const likes = pgTable(
  "likes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.reviewId] }),
    index("likes_review_idx").on(table.reviewId),
  ]
);

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, { fields: [likes.userId], references: [users.id] }),
  review: one(reviews, { fields: [likes.reviewId], references: [reviews.id] }),
}));

// ---------------------------------------------------------------------------
// Comments (on reviews)
// ---------------------------------------------------------------------------
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("comments_review_idx").on(table.reviewId)]
);

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  review: one(reviews, { fields: [comments.reviewId], references: [reviews.id] }),
}));
