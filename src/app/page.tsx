import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getFeedReviews, searchConcerts } from "@/lib/db/queries";
import ReviewCard from "@/components/ReviewCard";
import ConcertCard from "@/components/ConcertCard";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    const recentConcerts = (await searchConcerts()).slice(0, 6);
    return (
      <div className="flex flex-col gap-12">
        <section className="text-center flex flex-col items-center gap-4 py-10">
          <h1 className="text-3xl sm:text-4xl font-bold max-w-xl">
            Log the shows you&apos;ve been to.
          </h1>
          <p className="text-[var(--muted)] max-w-md">
            Rate concerts, write reviews, share photos and video from the pit, and keep a
            running top four of your favorite shows ever.
          </p>
          <div className="flex gap-3 mt-2">
            <Link href="/signup" className="btn btn-accent">
              Get started
            </Link>
            <Link href="/concerts" className="btn btn-ghost">
              Browse concerts
            </Link>
          </div>
        </section>

        {recentConcerts.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Recently logged</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentConcerts.map((concert) => (
                <ConcertCard key={concert.id} concert={concert} />
              ))}
            </div>
          </section>
        )}
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
