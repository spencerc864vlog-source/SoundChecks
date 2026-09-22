import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getReviewsByUser, getTopFourForUser, getUserByUsername } from "@/lib/db/queries";
import EditProfileForm from "./EditProfileForm";
import TopFourForm from "./TopFourForm";
import DeleteAccountForm from "./DeleteAccountForm";

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const currentUser = await requireUser(`/u/${username}/edit`);

  const profileUser = await getUserByUsername(username);
  if (!profileUser) notFound();
  if (profileUser.id !== currentUser.id) {
    redirect(`/u/${username}`);
  }

  const [reviews, topFour] = await Promise.all([
    getReviewsByUser(currentUser.id),
    getTopFourForUser(currentUser.id),
  ]);

  const concertOptions = reviews.map((r) => ({
    id: r.concert.id,
    artist: r.concert.artist,
    venue: r.concert.venue.name,
    date: r.concert.date,
  }));

  const slots: (string | null)[] = [null, null, null, null];
  for (const entry of topFour) {
    if (entry.position >= 1 && entry.position <= 4) {
      slots[entry.position - 1] = entry.concertId;
    }
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-6">
      <EditProfileForm
        displayName={currentUser.displayName}
        bio={currentUser.bio}
        avatarUrl={currentUser.avatarUrl}
      />
      <TopFourForm concerts={concertOptions} currentSlots={slots} />
      <DeleteAccountForm />
    </div>
  );
}
