import Link from "next/link";
import ConcertPoster from "./ConcertPoster";

const ROTATIONS = ["-rotate-6", "rotate-3", "-rotate-2", "rotate-6", "-rotate-3"];

/**
 * The logged-out landing page's hero: a full-bleed section (it breaks out of
 * the site's centered max-w-5xl content column on purpose, via the
 * mx-[calc(50%-50vw)] trick) with a soft, concert-lighting-style gradient
 * backdrop, and — when there are real shows in the database — a fanned
 * stack of their poster tiles as decoration. Falls back to just the
 * gradient (no fan) on a brand new, empty database.
 */
export default function HomeHero({
  posters,
}: {
  posters: { id: string; artist: string; imageUrl: string | null }[];
}) {
  const decorative = posters.slice(0, 5);

  return (
    <section className="relative mx-[calc(50%-50vw)] w-screen overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 80% at 15% 20%, rgba(79,141,253,0.35), transparent 60%), " +
            "radial-gradient(50% 70% at 88% 12%, rgba(124,58,237,0.32), transparent 60%), " +
            "radial-gradient(70% 60% at 50% 105%, rgba(244,114,182,0.16), transparent 60%), " +
            "var(--background)",
        }}
      />
      <div className="relative w-full max-w-5xl mx-auto px-4 py-16 sm:py-24 grid lg:grid-cols-[1.1fr_0.9fr] items-center gap-10">
        <div className="flex flex-col items-start gap-5 text-left">
          <span className="text-xs font-semibold tracking-widest uppercase text-[var(--accent-strong)]">
            The social network for concertgoers
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold leading-[1.08] max-w-xl">
            Log the shows
            <br />
            you&apos;ve been to.
          </h1>
          <p className="text-[var(--muted)] max-w-md text-base sm:text-lg leading-relaxed">
            Rate concerts, write reviews, share photos and video from the pit, and keep a
            running top four of your favorite shows ever.
          </p>
          <div className="flex flex-wrap gap-3 mt-2">
            <Link href="/signup" className="btn btn-accent !px-6 !py-3 text-base">
              Get started — it&apos;s free
            </Link>
            <Link href="/concerts" className="btn btn-ghost !px-6 !py-3 text-base">
              Browse concerts
            </Link>
          </div>
        </div>

        {decorative.length > 0 && (
          <div className="hidden lg:block relative w-[420px] h-80 mx-auto" aria-hidden>
            {decorative.map((c, i) => (
              <div
                key={c.id}
                className={`absolute w-36 rounded-lg shadow-2xl shadow-black/50 ${ROTATIONS[i % ROTATIONS.length]}`}
                style={{ left: `${i * 62}px`, top: `${(i % 2) * 28}px` }}
              >
                <ConcertPoster artist={c.artist} imageUrl={c.imageUrl} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
