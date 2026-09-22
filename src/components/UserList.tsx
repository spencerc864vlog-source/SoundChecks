import Link from "next/link";
import { initials } from "@/lib/format";
import FollowButton from "@/components/FollowButton";

type ListedUser = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
};

export default function UserList({
  users,
  currentUserId,
  followingIds,
  redirectPath,
  emptyMessage,
}: {
  users: ListedUser[];
  currentUserId?: string;
  followingIds: Set<string>;
  redirectPath: string;
  emptyMessage: string;
}) {
  if (users.length === 0) {
    return <p className="text-sm text-[var(--muted)]">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {users.map((user) => (
        <div key={user.id} className="card p-4 flex items-center gap-4">
          <Link href={`/u/${user.username}`} className="shrink-0">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-sm font-semibold">
                {initials(user.displayName)}
              </div>
            )}
          </Link>

          <Link href={`/u/${user.username}`} className="flex-1 min-w-0">
            <p className="font-medium truncate">{user.displayName}</p>
            <p className="text-sm text-[var(--muted)] truncate">@{user.username}</p>
            {user.bio && (
              <p className="text-sm text-[var(--muted)] mt-1 line-clamp-1">{user.bio}</p>
            )}
          </Link>

          {currentUserId && currentUserId !== user.id && (
            <FollowButton
              targetUserId={user.id}
              redirectPath={redirectPath}
              isFollowing={followingIds.has(user.id)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
