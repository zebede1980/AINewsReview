import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const sources = await db.rSSSource.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(sources);
}

export async function POST(req: Request) {
  const body = await req.json() as { name?: string; url?: string; biasLabel?: string };
  const { name, url, biasLabel } = body;

  if (!name || !url) {
    return NextResponse.json({ error: "name and url are required" }, { status: 400 });
  }

  const source = await db.rSSSource.create({
    data: { name, url, biasLabel: biasLabel ?? "CENTER" },
  });
  return NextResponse.json(source, { status: 201 });
}
