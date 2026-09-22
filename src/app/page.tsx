import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import {
  getFeedReviews,
  getPopularLists,
  getPopularReviews,
  getRecentConcertsForHome,
  getTopReviewers,
} from "@/lib/db/queries";
import { getOrFetchArtistImage } from "@/lib/artistImages";
import ReviewCard from "@/components/ReviewCard";
import ConcertPoster from "@/components/ConcertPoster";
import HomeHero from "@/components/HomeHero";
import SoundcheckFeatures from "@/components/SoundcheckFeatures";
import { initials } from "@/lib/format";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    const [recentConcertsRaw, popularReviews, popularLists, topReviewers] = await Promise.all([
      getRecentConcertsForHome(10),
      getPopularReviews(4),
      getPopularLists(3),
      getTopReviewers(5),
    ]);

    // A real photo beats a gradient: prefer the show's own uploaded poster,
    // then fall back to the artist's Spotify photo (looked up/cached here,
    // in parallel, the same way an artist's own page does it), then finally
    // the gradient placeholder if neither exists.
    const recentConcerts = await Promise.all(
      recentConcertsRaw.map(async (concert) => {
        const artistImageUrl = concert.artistProfile
          ? await getOrFetchArtistImage(concert.artistProfile)
          : null;
        return { ...concert, imageUrl: concert.posterUrl ?? artistImageUrl };
      })
    );

    return (
      <div className="flex flex-col gap-16">
        <HomeHero posters={recentConcerts} />

        {recentConcerts.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Recently logged</h2>
              <Link href="/concerts" className="text-sm text-[var(--accent)] shrink-0">
                Browse all
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
              {recentConcerts.map((concert) => (
                <Link
                  key={concert.id}
                  href={`/concerts/${concert.id}`}
                  className="w-28 sm:w-32 shrink-0 flex flex-col gap-1.5 group"
                >
                  <ConcertPoster
                    artist={concert.artist}
                    imageUrl={concert.imageUrl}
                    className="group-hover:border-[var(--accent)] transition-colors"
                  />
                  <p className="text-xs font-medium truncate">{concert.artist}</p>
                  <p className="text-[11px] text-[var(--muted)] truncate">
                    {concert.venue.city}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="text-center flex flex-col items-center gap-2 py-6 border-y border-[var(--border)]">
          <p className="text-lg sm:text-xl font-semibold max-w-xl">
            Write and share reviews. Compile your own lists. Remember every show.
          </p>
          <p className="text-sm text-[var(--muted)] max-w-md">
            Below is real activity from Soundcheck this week.{" "}
            <Link href="/signup" className="text-[var(--accent)]">
              Sign up
            </Link>{" "}
            to add your own.
          </p>
        </section>

        <section className="grid lg:grid-cols-[1fr_320px] gap-10">
          <div className="flex flex-col gap-4 min-w-0">
            <h2 className="text-xs font-semibold tracking-widest uppercase text-[var(--muted)]">
              Popular reviews
            </h2>
            {popularReviews.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No reviews yet —{" "}
                <Link href="/signup" className="text-[var(--accent)]">
                  be the first to log a show
                </Link>
                .
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {popularReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} redirectPath="/" />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-8">
            {popularLists.length > 0 && (
              <div className="flex flex-col gap-3">
                <h2 className="text-xs font-semibold tracking-widest uppercase text-[var(--muted)]">
                  Popular lists
                </h2>
                <div className="flex flex-col gap-3">
                  {popularLists.map((list) => (
                    <Link
                      key={list.id}
                      href={`/u/${list.user.username}/lists/${list.id}`}
                      className="card p-3 flex flex-col gap-3 hover:border-[var(--accent)] transition-colors"
                    >
                      <div className="grid grid-cols-4 gap-1.5">
                        {list.preview.map((p, i) => (
                          <ConcertPoster
                            key={i}
                            artist={p.artist}
                            imageUrl={p.posterUrl}
                          />
                        ))}
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight truncate">
                          {list.title}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {list.user.displayName} · {list.itemCount}{" "}
                          {list.itemCount === 1 ? "show" : "shows"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {topReviewers.length > 0 && (
              <div className="flex flex-col gap-3">
                <h2 className="text-xs font-semibold tracking-widest uppercase text-[var(--muted)]">
                  Popular reviewers
                </h2>
                <div className="flex flex-col gap-2.5">
                  {topReviewers.map((reviewer) => (
                    <Link
                      key={reviewer.id}
                      href={`/u/${reviewer.username}`}
                      className="flex items-center gap-2.5 hover:text-[var(--accent)]"
                    >
                      {reviewer.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={reviewer.avatarUrl}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[10px] font-semibold shrink-0">
                          {initials(reviewer.displayName)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{reviewer.displayName}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {reviewer.reviewCount} {reviewer.reviewCount === 1 ? "review" : "reviews"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <SoundcheckFeatures />
      </div>
    );
  }

  const { reviews, isFollowingAnyone } = await getFeedReviews(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your feed</h1>
        <Link href="/concerts/new" className="btn btn-accent">
          + Log a show
        </Link>
      </div>

      {!isFollowingAnyone && (
        <p className="text-sm text-[var(--muted)]">
          You&apos;re not following anyone yet, so here&apos;s recent activity from everyone.{" "}
          Find people to follow from concert pages and reviews.
        </p>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          No activity yet.{" "}
          <Link href="/concerts/new" className="text-[var(--accent)]">
            Log your first show
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} currentUserId={user.id} redirectPath="/" />
          ))}
        </div>
      )}
    </div>
  );
}
