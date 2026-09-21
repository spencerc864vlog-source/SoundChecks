import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getConcertById, getReviewByUserAndConcert } from "@/lib/db/queries";
import { formatConcertDate } from "@/lib/format";
import ReviewForm from "./ReviewForm";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/concerts/${id}/review`);

  const concert = await getConcertById(id);
  if (!concert) notFound();

  const existing = await getReviewByUserAndConcert(user.id, id);

  return (
    <ReviewForm
      concertId={concert.id}
      concertLabel={`${concert.artist} — ${concert.venue.name}, ${concert.venue.city} · ${formatConcertDate(
        concert.date
      )}`}
      existingReviewId={existing?.id}
      initialRating={existing?.rating}
      initialBody={existing?.body}
      initialMedia={existing?.media.map((m) => ({ url: m.url, type: m.type as "photo" | "video" }))}
    />
  );
}
