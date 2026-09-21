import { toggleFollowAction } from "@/lib/actions/social";

export default function FollowButton({
  targetUserId,
  redirectPath,
  isFollowing,
}: {
  targetUserId: string;
  redirectPath: string;
  isFollowing: boolean;
}) {
  return (
    <form action={toggleFollowAction}>
      <input type="hidden" name="targetUserId" value={targetUserId} />
      <input type="hidden" name="redirectPath" value={redirectPath} />
      <button type="submit" className={isFollowing ? "btn btn-ghost" : "btn btn-accent"}>
        {isFollowing ? "Following" : "Follow"}
      </button>
    </form>
  );
}
