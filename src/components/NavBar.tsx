import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";
import { getUnreadNotificationCount } from "@/lib/db/queries";

export default async function NavBar() {
  const user = await getCurrentUser();
  const unreadCount = user ? await getUnreadNotificationCount(user.id) : 0;

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]/60 backdrop-blur sticky top-0 z-20">
      <div className="w-full max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="font-bold text-lg tracking-tight flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG, no need for next/image */}
          <img src="/logo.svg" alt="" width={24} height={24} className="shrink-0" />
          Soundcheck
        </Link>

        <nav className="hidden sm:flex items-center gap-5 text-sm text-[var(--muted)]">
          <Link href="/concerts" className="hover:text-[var(--foreground)]">
            Concerts
          </Link>
          <Link href="/artists" className="hover:text-[var(--foreground)]">
            Artists
          </Link>
          <Link href="/venues" className="hover:text-[var(--foreground)]">
            Venues
          </Link>
          {user && (
            <Link href="/concerts/new" className="hover:text-[var(--foreground)]">
              Log a show
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/notifications"
                className="relative text-[var(--muted)] hover:text-[var(--foreground)]"
                aria-label="Notifications"
              >
                <BellIcon />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--accent)] text-white text-[10px] leading-[16px] text-center font-semibold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <Link
                href={`/u/${user.username}`}
                className="text-sm font-medium hover:text-[var(--accent)]"
              >
                {user.displayName}
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="btn btn-ghost !py-1.5 !px-3 text-xs">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
                Log in
              </Link>
              <Link href="/signup" className="btn btn-accent !py-1.5 !px-3 text-xs">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
