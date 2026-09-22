import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getNotificationsForUser } from "@/lib/db/queries";
import { formatRelativeTime, initials } from "@/lib/format";
import { markAllNotificationsReadAction } from "@/lib/actions/notifications";

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const notifications = await getNotificationsForUser(user.id);
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Notifications</h1>
        {hasUnread && (
          <form action={markAllNotificationsReadAction}>
            <button type="submit" className="btn btn-ghost text-xs !py-1.5">
              Mark all as read
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          Nothing yet — you&apos;ll see follows, likes, and comments here.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => (
            <NotificationRow key={n.id} notification={n} />
          ))}
        </div>
      )}
    </div>
  );
}

type NotificationData = Awaited<ReturnType<typeof getNotificationsForUser>>[number];

function NotificationRow({ notification: n }: { notification: NotificationData }) {
  const actorName = n.actor?.displayName ?? "Someone";
  const href =
    n.type === "follow"
      ? n.actor
        ? `/u/${n.actor.username}`
        : "#"
      : n.review
        ? `/concerts/${n.review.concertId}`
        : "#";

  const message =
    n.type === "follow"
      ? `${actorName} started following you`
      : n.type === "like"
        ? `${actorName} liked your review of ${n.review?.concert.artist ?? "a show"}`
        : `${actorName} commented on your review of ${n.review?.concert.artist ?? "a show"}`;

  return (
    <Link
      href={href}
      className={`card p-4 flex items-center gap-3 hover:border-[var(--accent)] ${
        n.isRead ? "" : "border-[var(--accent)]"
      }`}
    >
      {n.actor?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={n.actor.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-xs font-semibold shrink-0">
          {initials(actorName)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm">{message}</p>
        <p className="text-xs text-[var(--muted)] mt-0.5">{formatRelativeTime(n.createdAt)}</p>
      </div>
      {!n.isRead && <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />}
    </Link>
  );
}
