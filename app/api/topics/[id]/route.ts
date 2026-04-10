import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as { name?: string; keywords?: string[]; active?: boolean };

  const topic = await db.topic.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.keywords !== undefined && { keywords: JSON.stringify(body.keywords) }),
      ...(body.active !== undefined && { active: body.active }),
    },
  });
  return NextResponse.json(topic);
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  await db.topic.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
