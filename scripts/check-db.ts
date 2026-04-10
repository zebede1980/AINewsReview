import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./data/dev.db" }) });
async function main() {
  const topics = await db.topic.findMany();
  const sources = await db.rSSSource.findMany({ orderBy: { name: "asc" } });
  const articleCount = await db.article.count();
  const storyCount = await db.story.count();
  console.log("Topics:", topics.map(t => `${t.name} (active:${t.active})`).join(", "));
  console.log("Sources:", sources.length, "total,", sources.filter(s => s.active).length, "active");
  sources.forEach(s => console.log(`  ${s.active ? "✓" : "✗"} ${s.name} — ${s.url}`));
  console.log("Articles:", articleCount, "| Stories:", storyCount);
  await db.$disconnect();
}
main().catch(console.error);
