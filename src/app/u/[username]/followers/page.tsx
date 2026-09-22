import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getFollowCounts, getFollowers, getFollowingSet, getUserByUsername } from "@/lib/db/queries";
import UserList from "@/components/UserList";

export default async function FollowersPage({
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

  const [followers, counts] = await Promise.all([
    getFollowers(profileUser.id),
    getFollowCounts(profileUser.id),
  ]);

  const followingIds = currentUser
    ? await getFollowingSet(
        currentUser.id,
        followers.map((u) => u.id)
      )
    : new Set<string>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/u/${username}`} className="text-sm text-[var(--accent)]">
          ← {profileUser.displayName}
        </Link>
        <h1 className="text-xl font-bold mt-1">Followers</h1>
      </div>

      <div className="flex items-center gap-4 border-b border-[var(--border)] text-sm">
        <span className="pb-2 border-b-2 border-[var(--accent)] font-medium">
          Followers ({counts.followers})
        </span>
        <Link href={`/u/${username}/following`} className="pb-2 text-[var(--muted)]">
          Following ({counts.following})
        </Link>
      </div>

      <UserList
        users={followers}
        currentUserId={currentUser?.id}
        followingIds={followingIds}
        redirectPath={`/u/${username}/followers`}
        emptyMessage={`${profileUser.displayName} doesn't have any followers yet.`}
      />
    </div>
  );
}
