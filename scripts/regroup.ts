/**
 * Run this once to delete badly-grouped stories and regroup articles properly.
 * usage: npx tsx scripts/regroup.ts
 */
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { groupArticlesIntoStories } from "../lib/rss";

const DB_URL = process.env.DATABASE_URL ?? "file:./data/dev.db";
const adapter = new PrismaBetterSqlite3({ url: DB_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Delete all existing stories (and their linked analyses via cascade)
  const deleted = await prisma.story.deleteMany({});
  console.log(`Deleted ${deleted.count} old stories.`);

  // Re-run grouping with the new similarity algorithm
  const newStories = await groupArticlesIntoStories();
  console.log(`Created ${newStories.length} new stories.`);

  await prisma.$disconnect();
}

main().catch(console.error);
