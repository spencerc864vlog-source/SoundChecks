import { requireUser } from "@/lib/auth";
import ShowSearch from "./ShowSearch";
import NewConcertForm from "./NewConcertForm";

export default async function NewConcertPage() {
  await requireUser("/concerts/new");

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold mb-1">Log a show</h1>
        <p className="text-sm text-[var(--muted)]">
          Search for the artist to find the show, then rate and review it on the next screen.
        </p>
      </div>

      <div className="card p-6">
        <ShowSearch />
      </div>

      <details className="group">
        <summary className="cursor-pointer text-sm text-[var(--accent)] select-none">
          Can&apos;t find it? Add manually
        </summary>
        <div className="mt-3">
          <NewConcertForm />
        </div>
      </details>
    </div>
  );
}
