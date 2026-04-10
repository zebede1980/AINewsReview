import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as { name?: string; url?: string; biasLabel?: string; active?: boolean };

  const source = await db.rSSSource.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.url !== undefined && { url: body.url }),
      ...(body.biasLabel !== undefined && { biasLabel: body.biasLabel }),
      ...(body.active !== undefined && { active: body.active }),
    },
  });
  return NextResponse.json(source);
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  await db.rSSSource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
