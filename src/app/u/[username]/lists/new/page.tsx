import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getUserByUsername } from "@/lib/db/queries";
import ListForm from "@/components/ListForm";

export default async function NewListPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ concertId?: string }>;
}) {
  const { username } = await params;
  const { concertId } = await searchParams;

  const [profileUser, currentUser] = await Promise.all([
    getUserByUsername(username),
    requireUser(`/u/${username}/lists/new`),
  ]);
  if (!profileUser) notFound();
  if (profileUser.id !== currentUser.id) redirect(`/u/${currentUser.username}/lists/new`);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/u/${username}/lists`} className="text-sm text-[var(--accent)]">
          ← Lists
        </Link>
        <h1 className="text-xl font-bold mt-1">New list</h1>
      </div>

      <ListForm concertId={concertId} />
    </div>
  );
}
