import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;

  const story = await db.story.findUnique({
    where: { id },
    include: {
      topic: true,
      analysis: true,
      articles: {
        include: {
          article: { include: { source: true } },
        },
      },
    },
  });

  if (!story) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(story);
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  await db.story.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
