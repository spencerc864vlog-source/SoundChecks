import { toggleWantToGoAction } from "@/lib/actions/want-to-go";
import type { UpcomingShow } from "@/lib/ticketmaster";

export default function WantToGoButton({
  show,
  isWantToGo,
  redirectPath,
}: {
  show: UpcomingShow;
  isWantToGo: boolean;
  redirectPath: string;
}) {
  return (
    <form action={toggleWantToGoAction}>
      <input type="hidden" name="ticketmasterEventId" value={show.id} />
      <input type="hidden" name="eventName" value={show.name} />
      <input type="hidden" name="eventDate" value={show.date ?? ""} />
      <input type="hidden" name="venueName" value={show.venueName ?? ""} />
      <input type="hidden" name="city" value={show.city ?? ""} />
      <input type="hidden" name="eventUrl" value={show.url} />
      <input type="hidden" name="redirectPath" value={redirectPath} />
      <button
        type="submit"
        className={isWantToGo ? "btn btn-ghost text-xs !py-1 !px-2.5" : "btn btn-accent text-xs !py-1 !px-2.5"}
      >
        {isWantToGo ? "Going" : "Want to go"}
      </button>
    </form>
  );
}
