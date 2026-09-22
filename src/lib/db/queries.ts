import "server-only";
import { and, avg, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
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

/**
 * Most-recently-logged shows for the homepage's hero art and "Recently
 * logged" rail — includes the linked artists row (not just the free-text
 * artist name) so the caller can pull that artist's Spotify photo.
 */
export async function getRecentConcertsForHome(limit = 10) {
  const rows = await db
    .select({
      concert: schema.concerts,
      venue: schema.venues,
      artistProfile: schema.artists,
    })
    .from(schema.concerts)
    .innerJoin(schema.venues, eq(schema.venues.id, schema.concerts.venueId))
    .leftJoin(schema.artists, eq(schema.artists.id, schema.concerts.artistId))
    .orderBy(desc(schema.concerts.date))
    .limit(limit);

  return rows.map(({ concert, venue, artistProfile }) => ({ ...concert, venue, artistProfile }));
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
    with: { venue: true, artistProfile: true },
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
// Artists
// ---------------------------------------------------------------------------

/** Finds an existing artist by name, case-insensitively, or creates one. */
export async function findOrCreateArtist(name: string) {
  const existing = await db.query.artists.findFirst({
    where: ilike(schema.artists.name, name),
  });
  if (existing) return existing;

  const [artist] = await db.insert(schema.artists).values({ name }).returning();
  return artist;
}

export async function searchArtists(query?: string) {
  const whereClause = query ? ilike(schema.artists.name, `%${query}%`) : undefined;

  const rows = await db
    .select({
      artist: schema.artists,
      avgRating: avg(schema.artistRatings.rating),
      ratingCount: count(schema.artistRatings.id),
    })
    .from(schema.artists)
    .leftJoin(schema.artistRatings, eq(schema.artistRatings.artistId, schema.artists.id))
    .where(whereClause)
    .groupBy(schema.artists.id)
    .orderBy(desc(schema.artists.createdAt))
    .limit(60);

  return rows.map(({ artist, avgRating, ratingCount }) => ({
    ...artist,
    avgRating: avgRating ? Number(avgRating) : null,
    ratingCount: Number(ratingCount),
  }));
}

export async function getArtistById(artistId: string) {
  return db.query.artists.findFirst({ where: eq(schema.artists.id, artistId) });
}

export async function getArtistStats(artistId: string) {
  const [row] = await db
    .select({
      avgRating: avg(schema.artistRatings.rating),
      ratingCount: count(schema.artistRatings.id),
    })
    .from(schema.artistRatings)
    .where(eq(schema.artistRatings.artistId, artistId));

  return {
    avgRating: row?.avgRating ? Number(row.avgRating) : null,
    ratingCount: row ? Number(row.ratingCount) : 0,
  };
}

export async function getRatingsForArtist(artistId: string) {
  return db.query.artistRatings.findMany({
    where: eq(schema.artistRatings.artistId, artistId),
    with: { user: true },
    orderBy: (r, { desc }) => [desc(r.createdAt)],
  });
}

export async function getArtistRatingByUser(userId: string, artistId: string) {
  return db.query.artistRatings.findFirst({
    where: and(eq(schema.artistRatings.userId, userId), eq(schema.artistRatings.artistId, artistId)),
  });
}

/** Concerts logged in Soundcheck for this artist, most recent first. */
export async function getConcertsForArtist(artistId: string) {
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
    .where(eq(schema.concerts.artistId, artistId))
    .groupBy(schema.concerts.id, schema.venues.id)
    .orderBy(desc(schema.concerts.date))
    .limit(30);

  return rows.map(({ concert, venue, avgRating, reviewCount }) => ({
    ...concert,
    venue,
    avgRating: avgRating ? Number(avgRating) : null,
    reviewCount: Number(reviewCount),
  }));
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function getUnreadNotificationCount(userId: string) {
  const [row] = await db
    .select({ total: count() })
    .from(schema.notifications)
    .where(and(eq(schema.notifications.userId, userId), eq(schema.notifications.isRead, false)));
  return row ? Number(row.total) : 0;
}

export async function getNotificationsForUser(userId: string) {
  return db.query.notifications.findMany({
    where: eq(schema.notifications.userId, userId),
    with: {
      actor: true,
      review: { with: { concert: true } },
    },
    orderBy: (n, { desc }) => [desc(n.createdAt)],
    limit: 50,
  });
}

// ---------------------------------------------------------------------------
// Want to go
// ---------------------------------------------------------------------------

/** Which Ticketmaster event IDs this user has already flagged, for rendering button state. */
export async function getWantToGoIds(userId: string) {
  const rows = await db
    .select({ id: schema.wantToGo.ticketmasterEventId })
    .from(schema.wantToGo)
    .where(eq(schema.wantToGo.userId, userId));
  return new Set(rows.map((r) => r.id));
}

export async function getWantToGoForUser(userId: string) {
  return db.query.wantToGo.findMany({
    where: eq(schema.wantToGo.userId, userId),
    orderBy: (w, { asc }) => [asc(w.eventDate)],
  });
}

// ---------------------------------------------------------------------------
// Year in review
// ---------------------------------------------------------------------------

/** Years this user has logged at least one show in, most recent first. */
export async function getReviewYearsForUser(userId: string) {
  // Postgres requires a SELECT DISTINCT's ORDER BY to use the exact same
  // expression as the select list, so reuse one `sql` fragment for both.
  const yearExpr = sql<number>`extract(year from ${schema.concerts.date})::int`;

  const rows = await db
    .selectDistinct({ year: yearExpr.as("year") })
    .from(schema.reviews)
    .innerJoin(schema.concerts, eq(schema.concerts.id, schema.reviews.concertId))
    .where(eq(schema.reviews.userId, userId))
    .orderBy(desc(yearExpr));

  return rows.map((r) => r.year);
}

export async function getYearInReview(userId: string, year: number) {
  const rows = await db
    .select({
      concertId: schema.concerts.id,
      artist: schema.concerts.artist,
      date: schema.concerts.date,
      rating: schema.reviews.rating,
      venueName: schema.venues.name,
      venueCity: schema.venues.city,
    })
    .from(schema.reviews)
    .innerJoin(schema.concerts, eq(schema.concerts.id, schema.reviews.concertId))
    .innerJoin(schema.venues, eq(schema.venues.id, schema.concerts.venueId))
    .where(
      and(
        eq(schema.reviews.userId, userId),
        sql`extract(year from ${schema.concerts.date}) = ${year}`
      )
    )
    .orderBy(schema.concerts.date);

  const totalShows = rows.length;
  const avgRating =
    totalShows > 0 ? rows.reduce((sum, r) => sum + r.rating, 0) / totalShows : null;

  const artistCounts = new Map<string, number>();
  const venueCounts = new Map<string, number>();
  const monthCounts = new Array(12).fill(0) as number[];

  for (const r of rows) {
    artistCounts.set(r.artist, (artistCounts.get(r.artist) ?? 0) + 1);
    const venueKey = `${r.venueName} · ${r.venueCity}`;
    venueCounts.set(venueKey, (venueCounts.get(venueKey) ?? 0) + 1);
    monthCounts[new Date(r.date).getUTCMonth()] += 1;
  }

  const topByCount = (map: Map<string, number>) => {
    let top: { name: string; count: number } | null = null;
    for (const [name, entryCount] of map) {
      if (!top || entryCount > top.count) top = { name, count: entryCount };
    }
    return top;
  };

  return {
    year,
    totalShows,
    avgRating,
    topArtist: topByCount(artistCounts),
    topVenue: topByCount(venueCounts),
    monthCounts,
    concerts: rows,
  };
}

// ---------------------------------------------------------------------------
// Lists (named collections of concerts)
// ---------------------------------------------------------------------------

export async function getListsByUser(userId: string) {
  const rows = await db
    .select({
      list: schema.lists,
      itemCount: count(schema.listItems.id),
    })
    .from(schema.lists)
    .leftJoin(schema.listItems, eq(schema.listItems.listId, schema.lists.id))
    .where(eq(schema.lists.userId, userId))
    .groupBy(schema.lists.id)
    .orderBy(desc(schema.lists.updatedAt));

  return rows.map(({ list, itemCount }) => ({ ...list, itemCount: Number(itemCount) }));
}

export async function getListById(listId: string) {
  const list = await db.query.lists.findFirst({
    where: eq(schema.lists.id, listId),
    with: { user: true },
  });
  if (!list) return null;

  const items = await db.query.listItems.findMany({
    where: eq(schema.listItems.listId, listId),
    with: { concert: { with: { venue: true } } },
    orderBy: (i, { asc }) => [asc(i.position)],
  });

  return { ...list, items };
}

/** Lightweight — just id/title, for the "add to a list" picker. */
export async function getListPickerOptions(userId: string) {
  return db.query.lists.findMany({
    where: eq(schema.lists.userId, userId),
    columns: { id: true, title: true },
    orderBy: (l, { desc }) => [desc(l.updatedAt)],
  });
}

/**
 * Lists with at least one show in them, ranked by size, for the homepage's
 * "Popular lists" rail. Each comes with a small poster preview (its first
 * few shows) so it doesn't read as a bare text link.
 */
export async function getPopularLists(limit = 3) {
  const rows = await db
    .select({
      list: schema.lists,
      user: schema.users,
      itemCount: count(schema.listItems.id),
    })
    .from(schema.lists)
    .innerJoin(schema.users, eq(schema.users.id, schema.lists.userId))
    .innerJoin(schema.listItems, eq(schema.listItems.listId, schema.lists.id))
    .groupBy(schema.lists.id, schema.users.id)
    .orderBy(desc(count(schema.listItems.id)), desc(schema.lists.updatedAt))
    .limit(limit);

  const listIds = rows.map((r) => r.list.id);
  const previewItems = listIds.length
    ? await db
        .select({
          listId: schema.listItems.listId,
          artist: schema.concerts.artist,
          posterUrl: schema.concerts.posterUrl,
          position: schema.listItems.position,
        })
        .from(schema.listItems)
        .innerJoin(schema.concerts, eq(schema.concerts.id, schema.listItems.concertId))
        .where(inArray(schema.listItems.listId, listIds))
        .orderBy(schema.listItems.position)
    : [];

  const previewsByList = groupBy(previewItems, (i) => i.listId);

  return rows.map(({ list, user, itemCount }) => ({
    ...list,
    user,
    itemCount: Number(itemCount),
    preview: (previewsByList.get(list.id) ?? []).slice(0, 4),
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

/**
 * Of the people `currentUserId` follows, which ones reviewed this concert —
 * and what did they rate it? Powers "Friends who were there" on a concert
 * page. A single joined query rather than fetching the follow list and every
 * review separately.
 */
export async function getFriendsWhoReviewedConcert(concertId: string, currentUserId: string) {
  return db
    .select({
      user: schema.users,
      reviewId: schema.reviews.id,
      rating: schema.reviews.rating,
    })
    .from(schema.reviews)
    .innerJoin(schema.users, eq(schema.users.id, schema.reviews.userId))
    .innerJoin(
      schema.follows,
      and(
        eq(schema.follows.followingId, schema.reviews.userId),
        eq(schema.follows.followerId, currentUserId)
      )
    )
    .where(eq(schema.reviews.concertId, concertId))
    .orderBy(desc(schema.reviews.createdAt));
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

/**
 * Reviews ranked by like count (ties broken by recency), for the homepage's
 * "Popular reviews" rail — visible to logged-out visitors too, so it can't
 * depend on a viewer's follow graph the way getFeedReviews does.
 */
export async function getPopularReviews(limit = 5) {
  const rows = await db
    .select({ id: schema.reviews.id, likeCount: count(schema.likes.userId) })
    .from(schema.reviews)
    .leftJoin(schema.likes, eq(schema.likes.reviewId, schema.reviews.id))
    .groupBy(schema.reviews.id)
    .orderBy(desc(count(schema.likes.userId)), desc(schema.reviews.createdAt))
    .limit(limit);

  return hydrateReviews(rows.map((r) => r.id));
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

/** People who follow this user, newest follow first. */
export async function getFollowers(userId: string) {
  const rows = await db.query.follows.findMany({
    where: eq(schema.follows.followingId, userId),
    with: { follower: true },
    orderBy: (f, { desc }) => [desc(f.createdAt)],
  });
  return rows.map((r) => r.follower);
}

/** People this user follows, newest follow first. */
export async function getFollowing(userId: string) {
  const rows = await db.query.follows.findMany({
    where: eq(schema.follows.followerId, userId),
    with: { following: true },
    orderBy: (f, { desc }) => [desc(f.createdAt)],
  });
  return rows.map((r) => r.following);
}

/**
 * Of the given set of userIds, which ones does `viewerId` currently follow?
 * Used to render Follow/Following buttons throughout a followers/following list
 * without an N+1 query per row.
 */
export async function getFollowingSet(viewerId: string, userIds: string[]) {
  if (userIds.length === 0) return new Set<string>();
  const rows = await db
    .select({ followingId: schema.follows.followingId })
    .from(schema.follows)
    .where(
      and(eq(schema.follows.followerId, viewerId), inArray(schema.follows.followingId, userIds))
    );
  return new Set(rows.map((r) => r.followingId));
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

/** Most-active reviewers by review count, for the homepage's "Popular reviewers" rail. */
export async function getTopReviewers(limit = 5) {
  const rows = await db
    .select({ user: schema.users, reviewCount: count(schema.reviews.id) })
    .from(schema.users)
    .innerJoin(schema.reviews, eq(schema.reviews.userId, schema.users.id))
    .groupBy(schema.users.id)
    .orderBy(desc(count(schema.reviews.id)))
    .limit(limit);

  return rows.map(({ user, reviewCount }) => ({ ...user, reviewCount: Number(reviewCount) }));
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
