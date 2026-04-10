import { NextResponse } from "next/server";
import { searchNewsFeeds } from "@/lib/rss";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const limit = parseInt(searchParams.get("limit") ?? "30", 10);

  if (!query) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  try {
    const results = await searchNewsFeeds(query, Number.isFinite(limit) ? limit : 30);
    return NextResponse.json({ query, count: results.length, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
