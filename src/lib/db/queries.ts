import "server-only";
import { and, avg, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db, schema } from "./index";

// ---------------------------------------------------------------------------
// Concerts
// ---------------------------------------------------------------------------

export async function searchConcerts(query?: string) {
  const whereClause = query
    ? or(
        ilike(schema.concerts.artist, `%${query}%`),
        ilike(schema.venues.name, `%${query}%`),
        ilike(schema.venues.city, `%${query}%`),
        ilike(schema.concerts.tourName, `%${query}%`)
      )
    : undefined;

  const rows = await db
    .select({
      concert: schema.concerts,
      venue: schema.venues,
      avgRating: avg(schema.reviews.rating),
      reviewCount: count(schema.reviews.id),
    })
    .from(schema.concerts)
    .innerJoin(schema.venues, eq(schema.venues.id, schema.concerts.venueId))
    .leftJoin(schema.reviews, eq(schema.reviews.concertId, schema.concerts.id))
    .where(whereClause)
    .groupBy(schema.concerts.id, schema.venues.id)
    .orderBy(desc(schema.concerts.date))
    .limit(60);

  return rows.map(({ concert, venue, avgRating, reviewCount }) => ({
    ...concert,
    venue,
    avgRating: avgRating ? Number(avgRating) : null,
    reviewCount: Number(reviewCount),
  }));
}

export async function getConcertStats(concertId: string) {
  const [row] = await db
    .select({
      avgRating: avg(schema.reviews.rating),
      reviewCount: count(schema.reviews.id),
    })
    .from(schema.reviews)
    .where(eq(schema.reviews.concertId, concertId));

  return {
    avgRating: row?.avgRating ? Number(row.avgRating) : null,
    reviewCount: row ? Number(row.reviewCount) : 0,
  };
}

export async function getConcertById(concertId: string) {
  return db.query.concerts.findFirst({
    where: eq(schema.concerts.id, concertId),
    with: { venue: true },
  });
}

// ---------------------------------------------------------------------------
// Venues
// ---------------------------------------------------------------------------

/** Finds an existing venue by (name, city, country), case-insensitively, or creates one. */
export async function findOrCreateVenue(input: { name: string; city: string; country: string }) {
  const existing = await db.query.venues.findFirst({
    where: and(
      ilike(schema.venues.name, input.name),
      ilike(schema.venues.city, input.city),
      ilike(schema.venues.country, input.country)
    ),
  });
  if (existing) return existing;

  const [venue] = await db.insert(schema.venues).values(input).returning();
  return venue;
}

export async function searchVenues(query?: string) {
  const whereClause = query
    ? or(ilike(schema.venues.name, `%${query}%`), ilike(schema.venues.city, `%${query}%`))
    : undefined;

  const rows = await db
    .select({
      venue: schema.venues,
      avgRating: avg(schema.venueRatings.rating),
      ratingCount: count(schema.venueRatings.id),
    })
    .from(schema.venues)
    .leftJoin(schema.venueRatings, eq(schema.venueRatings.venueId, schema.venues.id))
    .where(whereClause)
    .groupBy(schema.venues.id)
    .orderBy(desc(schema.venues.createdAt))
    .limit(60);

  return rows.map(({ venue, avgRating, ratingCount }) => ({
    ...venue,
    avgRating: avgRating ? Number(avgRating) : null,
    ratingCount: Number(ratingCount),
  }));
}

export async function getVenueById(venueId: string) {
  return db.query.venues.findFirst({ where: eq(schema.venues.id, venueId) });
}

export async function getVenueStats(venueId: string) {
  const [row] = await db
    .select({
      avgRating: avg(schema.venueRatings.rating),
      ratingCount: count(schema.venueRatings.id),
    })
    .from(schema.venueRatings)
    .where(eq(schema.venueRatings.venueId, venueId));

  return {
    avgRating: row?.avgRating ? Number(row.avgRating) : null,
    ratingCount: row ? Number(row.ratingCount) : 0,
  };
}

export async function getRatingsForVenue(venueId: string) {
  return db.query.venueRatings.findMany({
    where: eq(schema.venueRatings.venueId, venueId),
    with: { user: true },
    orderBy: (r, { desc }) => [desc(r.createdAt)],
  });
}

export async function getVenueRatingByUser(userId: string, venueId: string) {
  return db.query.venueRatings.findFirst({
    where: and(eq(schema.venueRatings.userId, userId), eq(schema.venueRatings.venueId, venueId)),
  });
}

/** Concerts logged in Soundcheck that happened at this venue, most recent first. */
export async function getConcertsAtVenue(venueId: string) {
  const rows = await db
    .select({
      concert: schema.concerts,
      avgRating: avg(schema.reviews.rating),
      reviewCount: count(schema.reviews.id),
    })
    .from(schema.concerts)
    .leftJoin(schema.reviews, eq(schema.reviews.concertId, schema.concerts.id))
    .where(eq(schema.concerts.venueId, venueId))
    .groupBy(schema.concerts.id)
    .orderBy(desc(schema.concerts.date))
    .limit(30);

  return rows.map(({ concert, avgRating, reviewCount }) => ({
    ...concert,
    avgRating: avgRating ? Number(avgRating) : null,
    reviewCount: Number(reviewCount),
  }));
}

// ---------------------------------------------------------------------------
// Reviews (with author, media, and engagement counts)
// ---------------------------------------------------------------------------

export type ReviewWithDetails = Awaited<ReturnType<typeof hydrateReviews>>[number];

/** Attaches author, concert, media, like count/state, and comments to raw review rows. */
async function hydrateReviews(
  reviewIds: string[],
  currentUserId?: string
) {
  if (reviewIds.length === 0) return [];

  const [reviewRows, mediaRows, likeCountRows, commentRows, myLikeRows] = await Promise.all([
    db.query.reviews.findMany({
      where: inArray(schema.reviews.id, reviewIds),
      with: { user: true, concert: { with: { venue: true } } },
    }),
    db
      .select()
      .from(schema.reviewMedia)
      .where(inArray(schema.reviewMedia.reviewId, reviewIds))
      .orderBy(schema.reviewMedia.position),
    db
      .select({ reviewId: schema.likes.reviewId, total: count(schema.likes.userId) })
      .from(schema.likes)
      .where(inArray(schema.likes.reviewId, reviewIds))
      .groupBy(schema.likes.reviewId),
    db.query.comments.findMany({
      where: inArray(schema.comments.reviewId, reviewIds),
      with: { user: true },
      orderBy: (c, { asc }) => [asc(c.createdAt)],
    }),
    currentUserId
      ? db
          .select({ reviewId: schema.likes.reviewId })
          .from(schema.likes)
          .where(
            and(
              inArray(schema.likes.reviewId, reviewIds),
              eq(schema.likes.userId, currentUserId)
            )
          )
      : Promise.resolve([]),
  ]);

  const mediaByReview = groupBy(mediaRows, (m) => m.reviewId);
  const commentsByReview = groupBy(commentRows, (c) => c.reviewId);
  const likeCountByReview = new Map(likeCountRows.map((r) => [r.reviewId, Number(r.total)]));
  const likedByMe = new Set(myLikeRows.map((r) => r.reviewId));

  const byId = new Map(reviewRows.map((r) => [r.id, r]));

  return reviewIds
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((review) => ({
      ...review,
      media: mediaByReview.get(review.id) ?? [],
      comments: commentsByReview.get(review.id) ?? [],
      likeCount: likeCountByReview.get(review.id) ?? 0,
      likedByMe: likedByMe.has(review.id),
    }));
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K) {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return map;
}

export async function getReviewsForConcert(concertId: string, currentUserId?: string) {
  const rows = await db
    .select({ id: schema.reviews.id })
    .from(schema.reviews)
    .where(eq(schema.reviews.concertId, concertId))
    .orderBy(desc(schema.reviews.createdAt));

  return hydrateReviews(
    rows.map((r) => r.id),
    currentUserId
  );
}

export async function getReviewsByUser(userId: string, currentUserId?: string) {
  const rows = await db
    .select({ id: schema.reviews.id })
    .from(schema.reviews)
    .where(eq(schema.reviews.userId, userId))
    .orderBy(desc(schema.reviews.createdAt));

  return hydrateReviews(
    rows.map((r) => r.id),
    currentUserId
  );
}

export async function getReviewByUserAndConcert(userId: string, concertId: string) {
  return db.query.reviews.findFirst({
    where: and(eq(schema.reviews.userId, userId), eq(schema.reviews.concertId, concertId)),
    with: { media: true },
  });
}

/** Activity feed: reviews from people the user follows, falling back to everyone if they follow no one yet. */
export async function getFeedReviews(currentUserId: string) {
  const followingRows = await db
    .select({ id: schema.follows.followingId })
    .from(schema.follows)
    .where(eq(schema.follows.followerId, currentUserId));

  const followingIds = followingRows.map((r) => r.id);
  const authorFilter =
    followingIds.length > 0
      ? inArray(schema.reviews.userId, [...followingIds, currentUserId])
      : undefined;

  const rows = await db
    .select({ id: schema.reviews.id })
    .from(schema.reviews)
    .where(authorFilter)
    .orderBy(desc(schema.reviews.createdAt))
    .limit(30);

  const reviews = await hydrateReviews(
    rows.map((r) => r.id),
    currentUserId
  );

  return { reviews, isFollowingAnyone: followingIds.length > 0 };
}

// ---------------------------------------------------------------------------
// Users / profiles / social graph
// ---------------------------------------------------------------------------

export async function getUserByUsername(username: string) {
  return db.query.users.findFirst({ where: eq(schema.users.username, username) });
}

export async function getTopFourForUser(userId: string) {
  const rows = await db.query.topFour.findMany({
    where: eq(schema.topFour.userId, userId),
    with: { concert: { with: { venue: true } } },
    orderBy: (t, { asc }) => [asc(t.position)],
  });
  return rows;
}

export async function getFollowCounts(userId: string) {
  const [[followers], [following]] = await Promise.all([
    db
      .select({ total: count() })
      .from(schema.follows)
      .where(eq(schema.follows.followingId, userId)),
    db
      .select({ total: count() })
      .from(schema.follows)
      .where(eq(schema.follows.followerId, userId)),
  ]);
  return {
    followers: Number(followers?.total ?? 0),
    following: Number(following?.total ?? 0),
  };
}

export async function isFollowing(followerId: string, followingId: string) {
  const row = await db.query.follows.findFirst({
    where: and(
      eq(schema.follows.followerId, followerId),
      eq(schema.follows.followingId, followingId)
    ),
  });
  return !!row;
}

export async function getUserRatingStats(userId: string) {
  const [row] = await db
    .select({ avgRating: avg(schema.reviews.rating), total: count(schema.reviews.id) })
    .from(schema.reviews)
    .where(eq(schema.reviews.userId, userId));

  return {
    avgRating: row?.avgRating ? Number(row.avgRating) : null,
    total: row ? Number(row.total) : 0,
  };
}

export async function searchUsers(query: string) {
  if (!query.trim()) return [];
  return db.query.users.findMany({
    where: or(
      ilike(schema.users.username, `%${query}%`),
      ilike(schema.users.displayName, `%${query}%`)
    ),
    limit: 20,
  });
}
