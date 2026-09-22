import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getListById } from "@/lib/db/queries";
import { formatShortDate, formatRelativeTime } from "@/lib/format";
import { removeFromListAction, deleteListAction } from "@/lib/actions/lists";

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ username: string; listId: string }>;
}) {
  const { username, listId } = await params;
  const [list, currentUser] = await Promise.all([getListById(listId), getCurrentUser()]);

  if (!list || list.user.username !== username) notFound();

  const isOwner = currentUser?.id === list.userId;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/u/${username}/lists`} className="text-sm text-[var(--accent)]">
          ← {list.user.displayName}&apos;s lists
        </Link>
        <div className="flex items-start justify-between gap-3 mt-1">
          <div>
            <h1 className="text-xl font-bold">{list.title}</h1>
            {list.description && <p className="text-sm text-[var(--muted)] mt-1">{list.description}</p>}
            <p className="text-xs text-[var(--muted)] mt-2">
              {list.items.length} {list.items.length === 1 ? "show" : "shows"} · updated{" "}
              {formatRelativeTime(list.updatedAt)}
            </p>
          </div>

          {isOwner && (
            <form action={deleteListAction}>
              <input type="hidden" name="listId" value={list.id} />
              <button type="submit" className="btn btn-danger text-xs !py-1.5 shrink-0">
                Delete list
              </button>
            </form>
          )}
        </div>
      </div>

      {list.items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          Nothing in this list yet.{" "}
          {isOwner && (
            <>
              Add a show from{" "}
              <Link href="/concerts" className="text-[var(--accent)]">
                its concert page
              </Link>
              .
            </>
          )}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {list.items.map((item) => (
            <div key={item.id} className="card p-4 flex items-center gap-3">
              <Link
                href={`/concerts/${item.concert.id}`}
                className="flex-1 min-w-0 hover:text-[var(--accent)]"
              >
                <p className="font-medium truncate">{item.concert.artist}</p>
                <p className="text-sm text-[var(--muted)] truncate">
                  {item.concert.venue.name} · {item.concert.venue.city} ·{" "}
                  {formatShortDate(item.concert.date)}
                </p>
                {item.note && <p className="text-sm mt-1">{item.note}</p>}
              </Link>

              {isOwner && (
                <form action={removeFromListAction}>
                  <input type="hidden" name="listId" value={list.id} />
                  <input type="hidden" name="itemId" value={item.id} />
                  <button type="submit" className="btn btn-ghost text-xs !py-1.5 shrink-0">
                    Remove
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
