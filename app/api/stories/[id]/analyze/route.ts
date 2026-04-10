import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyzeStory } from "@/lib/ai";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const { id: storyId } = await params;

  const story = await db.story.findUnique({ where: { id: storyId } });
  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  // Mark as analyzing
  await db.story.update({ where: { id: storyId }, data: { status: "ANALYZING" } });

  try {
    const result = await analyzeStory(storyId);

    // Delete any previous analysis
    await db.analysis.deleteMany({ where: { storyId } });

    const analysis = await db.analysis.create({
      data: {
        storyId,
        headline: result.headline,
        coreFacts: JSON.stringify(result.coreFacts),
        biasReport: JSON.stringify(result.biasReport),
        probableTruth: result.probableTruth,
      },
    });

    await db.story.update({
      where: { id: storyId },
      data: { status: "ANALYZED", title: result.headline },
    });

    return NextResponse.json(analysis);
  } catch (err) {
    await db.story.update({ where: { id: storyId }, data: { status: "FAILED" } });
    const message = err instanceof Error ? err.message : "Analysis failed";
    console.error(`[Analyze] Story ${storyId} failed:`, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
