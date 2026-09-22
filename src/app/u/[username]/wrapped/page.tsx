import { notFound, redirect } from "next/navigation";
import { getReviewYearsForUser, getUserByUsername } from "@/lib/db/queries";

/** Redirects to the most recent year this user has logged shows in. */
export default async function WrappedIndexPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profileUser = await getUserByUsername(username);
  if (!profileUser) notFound();

  const years = await getReviewYearsForUser(profileUser.id);
  const targetYear = years[0] ?? new Date().getFullYear();

  redirect(`/u/${username}/wrapped/${targetYear}`);
}
