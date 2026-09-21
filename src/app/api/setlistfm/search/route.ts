import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchShowsByArtist, SetlistfmNotConfiguredError } from "@/lib/setlistfm";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const artist = searchParams.get("artist")?.trim() ?? "";
  const page = Number(searchParams.get("page") ?? "1") || 1;

  if (artist.length < 2) {
    return NextResponse.json({ shows: [], total: 0, page: 1 });
  }

  try {
    const result = await searchShowsByArtist(artist, page);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SetlistfmNotConfiguredError) {
      return NextResponse.json({ error: error.message, notConfigured: true }, { status: 501 });
    }
    const message = error instanceof Error ? error.message : "Search failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
