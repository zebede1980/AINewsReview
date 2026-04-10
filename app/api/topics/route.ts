import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const topics = await db.topic.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(topics);
}

export async function POST(req: Request) {
  const body = await req.json() as { name?: string; keywords?: string[] };
  const { name, keywords } = body;

  if (!name || !keywords?.length) {
    return NextResponse.json({ error: "name and keywords are required" }, { status: 400 });
  }

  const topic = await db.topic.create({
    data: { name, keywords: JSON.stringify(keywords) },
  });
  return NextResponse.json(topic, { status: 201 });
}
