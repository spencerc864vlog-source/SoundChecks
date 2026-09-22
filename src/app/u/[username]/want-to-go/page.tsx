import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUserByUsername, getWantToGoForUser } from "@/lib/db/queries";
import { formatShortDate } from "@/lib/format";
import WantToGoButton from "@/components/WantToGoButton";

export default async function WantToGoPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [profileUser, currentUser] = await Promise.all([
    getUserByUsername(username),
    getCurrentUser(),
  ]);
  if (!profileUser) notFound();

  const isOwnProfile = currentUser?.id === profileUser.id;
  const shows = await getWantToGoForUser(profileUser.id);
  const redirectPath = `/u/${username}/want-to-go`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/u/${username}`} className="text-sm text-[var(--accent)]">
          ← {profileUser.displayName}
        </Link>
        <h1 className="text-xl font-bold mt-1">Want to go</h1>
      </div>

      {shows.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          {isOwnProfile
            ? "Nothing flagged yet — hit \"Want to go\" on an upcoming show from a venue or artist page."
            : `${profileUser.displayName} hasn't flagged any upcoming shows yet.`}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {shows.map((show) => (
            <div key={show.id} className="card p-4 flex items-center gap-3">
              <a
                href={show.eventUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 min-w-0 hover:text-[var(--accent)]"
              >
                <p className="font-medium truncate">{show.eventName}</p>
                <p className="text-sm text-[var(--muted)] truncate">
                  {[show.venueName, show.city].filter(Boolean).join(" · ") || "Venue TBA"} ·{" "}
                  {show.eventDate ? formatShortDate(show.eventDate) : "date TBA"}
                </p>
              </a>
              {isOwnProfile && (
                <WantToGoButton
                  show={{
                    id: show.ticketmasterEventId,
                    name: show.eventName,
                    date: show.eventDate,
                    venueName: show.venueName,
                    city: show.city,
                    url: show.eventUrl,
                  }}
                  isWantToGo={true}
                  redirectPath={redirectPath}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
