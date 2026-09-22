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
  boolean,
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
  artistRatings: many(artistRatings),
  topFour: many(topFour),
  following: many(follows, { relationName: "follower" }),
  followers: many(follows, { relationName: "following" }),
  likes: many(likes),
  comments: many(comments),
  lists: many(lists),
  wantToGo: many(wantToGo),
  notifications: many(notifications, { relationName: "notificationRecipient" }),
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
    // Nullable FK to the artists table, so an artist can have its own page
    // (overall rating, every show logged, upcoming tour dates) without
    // touching the free-text `artist` column everything else already reads.
    // Backfilled for existing rows by matching on name; always set for new
    // concerts going forward (see findOrCreateArtist).
    artistId: uuid("artist_id").references(() => artists.id, { onDelete: "set null" }),
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
    // Nullable + set-null-on-delete (not cascade): if the person who logged
    // this show later deletes their account, the show itself — and anyone
    // else's review, list entry, or top four pick tied to it — should
    // survive. Only the "who added this" attribution is lost.
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("concerts_artist_idx").on(table.artist),
    index("concerts_artist_id_idx").on(table.artistId),
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
  // Named artistProfile (not "artist") so it never collides with the
  // existing free-text `artist` column when both are selected together.
  artistProfile: one(artists, {
    fields: [concerts.artistId],
    references: [artists.id],
  }),
  reviews: many(reviews),
  topFourEntries: many(topFour),
  listItems: many(listItems),
}));

// ---------------------------------------------------------------------------
// Artists (their own page: overall rating, every show logged, upcoming tour
// dates — mirrors the venues table)
// ---------------------------------------------------------------------------
export const artists = pgTable(
  "artists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    // Set once we've matched this artist to a Ticketmaster attraction, so we
    // can look up upcoming tour dates without re-searching every time.
    ticketmasterId: text("ticketmaster_id"),
    // Set once we've matched this artist to a Spotify artist, so we know
    // where imageUrl came from and don't re-search on every visit.
    spotifyId: text("spotify_id"),
    // Profile picture pulled from Spotify (same photo as their Spotify
    // artist page). Null until someone's viewed this artist's page at least
    // once, or if Spotify doesn't have a match/photo for them.
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("artists_name_idx").on(table.name),
    uniqueIndex("artists_ticketmaster_id_idx").on(table.ticketmasterId),
    uniqueIndex("artists_spotify_id_idx").on(table.spotifyId),
  ]
);

export const artistsRelations = relations(artists, ({ many }) => ({
  concerts: many(concerts),
  ratings: many(artistRatings),
}));

// ---------------------------------------------------------------------------
// Artist ratings (a rating + optional write-up for one user, for one artist
// overall — separate from any specific show's review)
// ---------------------------------------------------------------------------
export const artistRatings = pgTable(
  "artist_ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    // Rating stored in half-point units, 1-10 => 0.5-5.0 stars (same scale as reviews)
    rating: integer("rating").notNull(),
    body: text("body").default("").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("artist_ratings_user_artist_idx").on(table.userId, table.artistId),
    index("artist_ratings_artist_idx").on(table.artistId),
  ]
);

export const artistRatingsRelations = relations(artistRatings, ({ one }) => ({
  user: one(users, { fields: [artistRatings.userId], references: [users.id] }),
  artist: one(artists, { fields: [artistRatings.artistId], references: [artists.id] }),
}));

// ---------------------------------------------------------------------------
// Lists (Letterboxd-style named collections of concerts, e.g. "Best festivals
// of 2026")
// ---------------------------------------------------------------------------
export const lists = pgTable(
  "lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").default("").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("lists_user_idx").on(table.userId)]
);

export const listsRelations = relations(lists, ({ one, many }) => ({
  user: one(users, { fields: [lists.userId], references: [users.id] }),
  items: many(listItems),
}));

export const listItems = pgTable(
  "list_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    concertId: uuid("concert_id")
      .notNull()
      .references(() => concerts.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    note: text("note"),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("list_items_list_concert_idx").on(table.listId, table.concertId),
    index("list_items_list_idx").on(table.listId),
  ]
);

export const listItemsRelations = relations(listItems, ({ one }) => ({
  list: one(lists, { fields: [listItems.listId], references: [lists.id] }),
  concert: one(concerts, { fields: [listItems.concertId], references: [concerts.id] }),
}));

// ---------------------------------------------------------------------------
// Want to go (a flagged upcoming show from Ticketmaster's listings — these
// haven't happened yet, so they're not `concerts` rows; we snapshot the
// details we need to display the list without re-fetching Ticketmaster)
// ---------------------------------------------------------------------------
export const wantToGo = pgTable(
  "want_to_go",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ticketmasterEventId: text("ticketmaster_event_id").notNull(),
    eventName: text("event_name").notNull(),
    eventDate: date("event_date"),
    venueName: text("venue_name"),
    city: text("city"),
    eventUrl: text("event_url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("want_to_go_user_event_idx").on(table.userId, table.ticketmasterEventId),
    index("want_to_go_user_idx").on(table.userId),
  ]
);

export const wantToGoRelations = relations(wantToGo, ({ one }) => ({
  user: one(users, { fields: [wantToGo.userId], references: [users.id] }),
}));

// ---------------------------------------------------------------------------
// Notifications (someone followed you, liked your review, or commented on it)
// ---------------------------------------------------------------------------
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Recipient
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Who triggered it (null-safe: if that user is later deleted, the
    // notification survives with actorId set to null rather than vanishing)
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    type: text("type", { enum: ["follow", "like", "comment"] }).notNull(),
    reviewId: uuid("review_id").references(() => reviews.id, { onDelete: "cascade" }),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId),
    index("notifications_user_unread_idx").on(table.userId, table.isRead),
  ]
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
    relationName: "notificationRecipient",
  }),
  actor: one(users, {
    fields: [notifications.actorId],
    references: [users.id],
    relationName: "notificationActor",
  }),
  review: one(reviews, { fields: [notifications.reviewId], references: [reviews.id] }),
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
