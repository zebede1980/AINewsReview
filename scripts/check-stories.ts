import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./data/dev.db" }) });

async function main() {
  const stories = await db.story.findMany({
    include: { articles: { include: { article: { select: { title: true, source: { select: { name: true } } } } } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  for (const s of stories) {
    console.log(`\n== [${s.articles.length} articles] ${s.title.slice(0, 85)}`);
    for (const a of s.articles.slice(0, 5)) {
      console.log(`   [${a.article.source.name}] ${a.article.title.slice(0, 70)}`);
    }
  }

  await db.$disconnect();
}

main().catch(console.error);
