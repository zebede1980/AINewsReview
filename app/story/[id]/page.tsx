import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { StoryDetailClient } from "./StoryDetailClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function StoryPage({ params }: Props) {
  const { id } = await params;

  const story = await db.story.findUnique({
    where: { id },
    include: {
      topic: true,
      analysis: true,
      articles: {
        include: { article: { include: { source: true } } },
      },
    },
  });

  if (!story) notFound();

  return <StoryDetailClient story={JSON.parse(JSON.stringify(story))} />;
}
