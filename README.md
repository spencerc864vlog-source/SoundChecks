# Soundcheck

A Letterboxd-style app for concerts: create an account, log the shows you've
been to, rate and review them, attach photos/video, pin a top four to your
profile, and follow other people to see what they've been to.

Built with Next.js (App Router), TypeScript, Tailwind CSS, Postgres via
Drizzle ORM, and cookie-based session auth (no third-party auth provider).

## Features

- Email/password accounts (bcrypt-hashed passwords, JWT session cookie)
- Search a real database of past shows by artist (via setlist.fm) when
  logging one — no need to type in the venue/date by hand — with a manual
  fallback for shows it doesn't have
- Browse/search the concerts people have logged here
- Half-star ratings (0.5–5.0) with a written review
- Photo/video uploads on a review (stored in S3-compatible object storage —
  Cloudflare R2 recommended)
- Top four favorite concerts pinned to your profile, Letterboxd-style
- Follow other users, an activity feed of who you follow, likes and comments
  on reviews
- Venues are their own page: rate the venue itself (sound, sightlines,
  parking — separate from any specific show), see every show logged there,
  and see real upcoming shows via Ticketmaster

## Getting started locally

You'll need Node.js 20.9+ and a Postgres database (local or hosted).

```bash
npm install
cp .env.example .env
# edit .env: set DATABASE_URL and SESSION_SECRET at minimum
npm run db:migrate   # creates all tables from the migrations in drizzle/
npm run db:seed      # optional: adds sample users/concerts/venues/reviews
npm run dev
```

> Upgrading an existing database from before venues were split out into
> their own table? `npm run db:migrate` handles it — the migration in
> `drizzle/0001_glorious_mephisto.sql` creates the `venues` table, backfills
> a venue row for every distinct venue/city/country already in your
> `concerts` table, and points existing concerts at it, then
> `drizzle/0002_brown_sabretooth.sql` drops the old free-text columns. Just
> run `npm run db:migrate` once — no manual data massaging needed.

Open http://localhost:3000. If you ran the seed script, log in with:

- username: `alexr` (or `jordanm`, `samk`)
- password: `password123`

Photo/video upload requires the `S3_*` variables in `.env` — see
`.env.example` for the Cloudflare R2 setup steps. Without them, everything
else works; the upload button will show an error if you try to attach media.

Searching real past shows on the "Log a show" page requires
`SETLISTFM_API_KEY` in `.env` — see the next section. Without it, the search
box tells people to use the "add manually" fallback, which always works.

### Setting up show search (setlist.fm)

"Log a show" searches [setlist.fm](https://www.setlist.fm)'s database of real
concerts by artist, so people pick the actual show they went to (venue, date,
tour) instead of typing it in from memory. To turn it on:

1. Create a free account at https://www.setlist.fm/signup.
2. Grab an API key at https://www.setlist.fm/settings/api.
3. Set `SETLISTFM_API_KEY` in `.env`.

It's free, but per setlist.fm's terms that free tier is for non-commercial
use — if this ever turns into a paid product, check their current terms for
commercial API access. Shows imported from a search are matched by
setlist.fm's own show ID (`concerts.setlistfm_id` in the schema) so
re-searching the same show never creates a duplicate.

I verified the request/response shapes against setlist.fm's published API
docs and unit-tested the parsing logic, but couldn't make a live call against
the real API from the sandbox this was built in (network policy blocked it)
— so test the search box for real once you've got a key in place.

### Setting up upcoming shows (Ticketmaster)

A venue's page tries to show real upcoming shows there, via the
[Ticketmaster Discovery API](https://developer.ticketmaster.com/). To turn
it on:

1. Sign up (instant, free) at https://developer.ticketmaster.com/.
2. Create an app in their dashboard — it gives you a "Consumer Key".
3. Set `TICKETMASTER_API_KEY` in `.env` to that key.

The first time someone opens a venue's page, we search Ticketmaster for a
venue with a matching name/city and cache the match (`venues.ticketmaster_id`)
so we don't re-search on every visit. This matching is best-effort — a venue
with an unusual name, or one Ticketmaster doesn't cover, may come back with
"couldn't find this venue" even though the venue itself is fine. There's no
manual re-link UI yet; if a match is ever wrong, the fix is to clear that
venue's `ticketmaster_id` column directly (e.g. via `npm run db:studio`) so
it gets re-matched next visit.

Free tier is 5,000 calls/day, 5/second — plenty for a project this size.
Like the setlist.fm integration, I verified the request/response shapes
against Ticketmaster's published docs but couldn't make a live call from
this sandbox (network policy blocked it), so test a venue page for real once
you've got a key in place.

## Project structure

```
src/
  app/                    Routes (Next.js App Router)
    concerts/             Browse, add, view, and review concerts
    venues/                Browse/search venues; a venue's ratings + upcoming shows
    u/[username]/         Public profile + edit profile / top four
    login, signup/        Auth pages
    api/upload/           Presigned upload URL endpoint
    api/setlistfm/search/ Proxies a show search to setlist.fm (keeps the API key server-side)
  components/             Shared UI (star rating, review card, nav, etc.)
  lib/
    db/                   Drizzle schema, client, and query helpers
    actions/              Server Actions (the app's write path)
    auth.ts               Session cookie helpers (jose + bcryptjs)
    storage.ts             S3/R2 presigned upload helper
    setlistfm.ts           setlist.fm API client + response normalization
    ticketmaster.ts         Ticketmaster Discovery API client (venue matching + upcoming shows)
```

There's no separate backend/API layer beyond the one upload route — reads
happen directly in Server Components (`src/lib/db/queries.ts`) and writes go
through Server Actions (`src/lib/actions/*.ts`), which is the standard
Next.js App Router pattern.

## Database

Schema lives in `src/lib/db/schema.ts` (Drizzle ORM, plain TypeScript — no
code generation step, no native binaries required).

- `npm run db:generate` — generate a SQL migration file from the schema
  (writes to `drizzle/`)
- `npm run db:migrate` — apply generated migrations to the database
- `npm run db:push` — push the schema straight to the database without
  generating a migration file (fastest for local development)
- `npm run db:studio` — open Drizzle Studio, a GUI for browsing your data

## Deploying

A typical free/cheap setup:

1. **Database** — create a free Postgres instance on
   [Neon](https://neon.tech) or [Supabase](https://supabase.com). Copy the
   connection string into `DATABASE_URL`.
2. **Media storage** — create a bucket on
   [Cloudflare R2](https://developers.cloudflare.com/r2/) (free egress, no
   surprise bandwidth bills). Follow the steps in `.env.example`.
3. **App hosting** — push this repo to GitHub and import it on
   [Vercel](https://vercel.com). Add the environment variables from your
   `.env` in the Vercel project settings, then deploy.
4. After the first deploy, run the migrations against your production
   database once (from your machine, with `DATABASE_URL` pointed at
   production): `npm run db:migrate`.

## Notes on scope / what's deliberately simple

This is a solid v1, not a Letterboxd clone at scale. A few intentional
simplifications worth knowing about if you keep building on it:

- **Auth** is a hand-rolled JWT-in-a-cookie session (via `jose`), not a full
  auth provider — no email verification, password reset, or OAuth. That's
  straightforward to add later (or swap in an auth provider) without
  touching the data model.
- **One review per user per concert.** Editing a review replaces its rating,
  text, and media rather than keeping a history.
- **The feed** is your own + followed users' reviews, newest first — no
  ranking algorithm, no pagination yet (it's capped at the most recent 30).
- **Top four** only lets you pick from concerts you've already reviewed.
- Search is a simple `ILIKE` match on artist/venue/city/tour — fine at
  hundreds or thousands of concerts, not built for full-text search at scale.
- **Venues are matched by exact name + city + country** (case-insensitive)
  when a concert is logged. Typing a venue name slightly differently (a typo,
  "The Fillmore" vs "Fillmore") creates a second venue row instead of
  reusing the existing one. Fine for a v1; a real venue picker with
  autocomplete/fuzzy matching would be the next step.
- **Ticketmaster venue matching** (for upcoming shows) is also name/city
  based and best-effort, with the result cached on first lookup — see
  "Setting up upcoming shows" above for how to force a re-match.
