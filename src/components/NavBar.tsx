import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";

export default async function NavBar() {
  const user = await getCurrentUser();

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
