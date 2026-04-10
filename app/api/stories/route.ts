import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get("topicId");
  const status = searchParams.get("status");
  const take = parseInt(searchParams.get("take") ?? "20", 10);

  const stories = await db.story.findMany({
    where: {
      ...(topicId ? { topicId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      topic: true,
      analysis: { select: { headline: true, probableTruth: true, analyzedAt: true } },
      articles: { include: { article: { include: { source: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json(stories);
}
