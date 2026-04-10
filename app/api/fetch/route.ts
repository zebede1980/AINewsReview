import { NextResponse } from "next/server";
import { runFetchCycle } from "@/lib/scheduler";

export async function POST() {
  try {
    await runFetchCycle();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
