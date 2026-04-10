import { fetchAllSources, groupArticlesIntoStories } from "../lib/rss";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../lib/generated/prisma/client";

// ensure db is connected before starting
const _ = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./data/dev.db" }) });

async function main() {
  console.log("Fetching from all sources...");
  const newArticles = await fetchAllSources();
  console.log(`Fetched ${newArticles} new articles.`);

  console.log("Grouping into stories...");
  const newStories = await groupArticlesIntoStories();
  console.log(`Created ${newStories.length} new stories.`);
}

main().catch(console.error);
