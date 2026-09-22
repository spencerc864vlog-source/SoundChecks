import Link from "next/link";
import { notFound } from "next/navigation";
import { getReviewYearsForUser, getUserByUsername, getYearInReview } from "@/lib/db/queries";
import { formatRating, formatShortDate } from "@/lib/format";
import { StarDisplay } from "@/components/StarRating";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default async function WrappedYearPage({
  params,
}: {
  params: Promise<{ username: string; year: string }>;
}) {
  const { username, year: yearParam } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year)) notFound();

  const profileUser = await getUserByUsername(username);
  if (!profileUser) notFound();

  const [years, data] = await Promise.all([
    getReviewYearsForUser(profileUser.id),
    getYearInReview(profileUser.id, year),
  ]);

  const maxMonth = Math.max(1, ...data.monthCounts);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={`/u/${username}`} className="text-sm text-[var(--accent)]">
          ← {profileUser.displayName}
        </Link>
        <h1 className="text-2xl font-bold mt-1">{profileUser.displayName}&apos;s {year}</h1>

        {years.length > 1 && (
          <div className="flex items-center gap-3 mt-3 text-sm">
            {years.map((y) => (
              <Link
                key={y}
                href={`/u/${username}/wrapped/${y}`}
                className={
                  y === year
                    ? "font-semibold border-b-2 border-[var(--accent)] pb-1"
                    : "text-[var(--muted)] pb-1"
                }
              >
                {y}
              </Link>
            ))}
          </div>
        )}
      </div>

      {data.totalShows === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          No shows logged in {year}.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatTile label="Shows" value={String(data.totalShows)} />
            <StatTile
              label="Avg rating"
              value={data.avgRating !== null ? formatRating(Math.round(data.avgRating)) : "–"}
            />
            <StatTile
              label="Top artist"
              value={data.topArtist ? data.topArtist.name : "–"}
              sub={data.topArtist ? `${data.topArtist.count} shows` : undefined}
            />
            <StatTile
              label="Top venue"
              value={data.topVenue ? data.topVenue.name : "–"}
              sub={data.topVenue ? `${data.topVenue.count} shows` : undefined}
            />
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-[var(--muted)] mb-4">Shows by month</h2>
            <div className="flex items-end gap-2 h-32">
              {data.monthCounts.map((c, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className="w-full rounded-sm bg-[var(--accent)]"
                    style={{
                      height: `${(c / maxMonth) * 100}%`,
                      minHeight: c > 0 ? "4px" : "1px",
                      opacity: c > 0 ? 1 : 0.15,
                      backgroundColor: c > 0 ? undefined : "var(--border)",
                    }}
                    title={`${MONTH_LABELS[i]}: ${c}`}
                  />
                  <span className="text-[10px] text-[var(--muted)]">{MONTH_LABELS[i]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Every show</h2>
            <div className="flex flex-col gap-2">
              {data.concerts.map((c) => (
                <Link
                  key={c.concertId}
                  href={`/concerts/${c.concertId}`}
                  className="card p-3 flex items-center justify-between gap-3 hover:border-[var(--accent)]"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{c.artist}</p>
                    <p className="text-xs text-[var(--muted)] truncate">
                      {c.venueName} · {c.venueCity} · {formatShortDate(c.date)}
                    </p>
                  </div>
                  <StarDisplay rating={c.rating} size="sm" />
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="font-semibold text-lg leading-tight mt-1 truncate">{value}</p>
      {sub && <p className="text-xs text-[var(--muted)] mt-0.5">{sub}</p>}
    </div>
  );
}
