import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAvailableModels } from "@/lib/ai";

export async function GET() {
  const settings = await db.appSetting.findMany();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  // Don't return the raw API key to the client — just whether it's set
  return NextResponse.json({
    hasApiKey: !!map["ai.apiKey"],
    baseUrl: map["ai.baseUrl"] ?? "https://nano-gpt.com/api/v1",
    model: map["ai.model"] ?? "gpt-4o",
    fetchIntervalHours: map["fetch.intervalHours"] ?? "1",
  });
}

export async function PUT(req: Request) {
  const body = await req.json() as {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    fetchIntervalHours?: string;
  };

  const updates: Array<{ key: string; value: string }> = [];

  if (body.apiKey !== undefined) updates.push({ key: "ai.apiKey", value: body.apiKey });
  if (body.baseUrl) updates.push({ key: "ai.baseUrl", value: body.baseUrl });
  if (body.model) updates.push({ key: "ai.model", value: body.model });
  if (body.fetchIntervalHours) updates.push({ key: "fetch.intervalHours", value: body.fetchIntervalHours });

  for (const update of updates) {
    await db.appSetting.upsert({
      where: { key: update.key },
      update: { value: update.value },
      create: update,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function POST() {
  // Fetch available models from nano-gpt.com
  const models = await getAvailableModels();
  return NextResponse.json({ models });
}
