import { DashboardClient } from "./DashboardClient";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [stories, topics] = await Promise.all([
    db.story.findMany({
      include: {
        topic: true,
        analysis: { select: { headline: true, probableTruth: true, analyzedAt: true, biasReport: true } },
        articles: { include: { article: { include: { source: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.topic.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return <DashboardClient stories={JSON.parse(JSON.stringify(stories))} topics={JSON.parse(JSON.stringify(topics))} />;
}
