import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getListsByUser, getUserByUsername } from "@/lib/db/queries";
import { formatRelativeTime } from "@/lib/format";

export default async function ListsPage({
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
  const lists = await getListsByUser(profileUser.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href={`/u/${username}`} className="text-sm text-[var(--accent)]">
            ← {profileUser.displayName}
          </Link>
          <h1 className="text-xl font-bold mt-1">Lists</h1>
        </div>
        {isOwnProfile && (
          <Link href={`/u/${username}/lists/new`} className="btn btn-accent shrink-0">
            New list
          </Link>
        )}
      </div>

      {lists.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          {isOwnProfile
            ? "You haven't made any lists yet — group your favorite shows into a themed collection."
            : `${profileUser.displayName} hasn't made any lists yet.`}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {lists.map((list) => (
            <Link
              key={list.id}
              href={`/u/${username}/lists/${list.id}`}
              className="card p-4 flex flex-col gap-2 hover:border-[var(--accent)] transition-colors"
            >
              <h3 className="font-semibold leading-tight">{list.title}</h3>
              {list.description && (
                <p className="text-sm text-[var(--muted)] line-clamp-2">{list.description}</p>
              )}
              <p className="text-xs text-[var(--muted)] mt-1">
                {list.itemCount} {list.itemCount === 1 ? "show" : "shows"} · updated{" "}
                {formatRelativeTime(list.updatedAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
