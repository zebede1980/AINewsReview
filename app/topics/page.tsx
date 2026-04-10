import { TopicsClient } from "./TopicsClient";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TopicsPage() {
  const topics = await db.topic.findMany({ orderBy: { createdAt: "asc" } });
  return <TopicsClient topics={JSON.parse(JSON.stringify(topics))} />;
}
