import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const DB_URL = process.env.DATABASE_URL ?? "file:./data/dev.db";
const adapter = new PrismaBetterSqlite3({ url: DB_URL });
const prisma = new PrismaClient({ adapter });

const sources = [
  { name: "AP News", url: "https://rsshub.app/apnews/topics/apf-topnews", biasLabel: "CENTER" },  // Replace with self-hosted RSSHub if needed
  { name: "Reuters", url: "https://feeds.reuters.com/reuters/topNews", biasLabel: "CENTER" },
  { name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml", biasLabel: "CENTER_LEFT" },
  { name: "The Guardian", url: "https://www.theguardian.com/world/rss", biasLabel: "CENTER_LEFT" },
  { name: "NPR News", url: "https://feeds.npr.org/1001/rss.xml", biasLabel: "CENTER_LEFT" },
  { name: "The Hill", url: "https://thehill.com/feed/", biasLabel: "CENTER" },
  { name: "Fox News", url: "https://moxie.foxnews.com/google-publisher/world.xml", biasLabel: "RIGHT" },
  { name: "Al Jazeera English", url: "https://www.aljazeera.com/xml/rss/all.xml", biasLabel: "CENTER" },
  { name: "ProPublica", url: "https://www.propublica.org/feeds/propublica/main", biasLabel: "CENTER_LEFT" },
  { name: "Reason", url: "https://reason.com/feed/", biasLabel: "RIGHT" },
  { name: "The Economist", url: "https://www.economist.com/international/rss.xml", biasLabel: "CENTER" },
  { name: "Associated Press (via RSSBridge)", url: "https://www.apnews.com/apf-topnews", biasLabel: "CENTER" },
];

const defaultSettings = [
  { key: "ai.baseUrl", value: "https://nano-gpt.com/api/v1" },
  { key: "ai.model", value: "gpt-4o" },
  { key: "ai.apiKey", value: "" },
  { key: "fetch.intervalHours", value: "1" },
];

const defaultTopics = [
  { name: "Artificial Intelligence", keywords: JSON.stringify(["artificial intelligence", "AI", "machine learning", "ChatGPT", "OpenAI", "LLM"]) },
  { name: "Climate Change", keywords: JSON.stringify(["climate change", "global warming", "carbon emissions", "net zero", "renewable energy"]) },
  { name: "World Politics", keywords: JSON.stringify(["election", "president", "parliament", "government", "democracy", "geopolitics"]) },
];

async function main() {
  console.log("Seeding database...");

  for (const source of sources) {
    await prisma.rSSSource.upsert({
      where: { url: source.url },
      update: source,
      create: source,
    });
  }

  for (const setting of defaultSettings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  for (const topic of defaultTopics) {
    await prisma.topic.upsert({
      where: { name: topic.name },
      update: {},
      create: topic,
    });
  }

  console.log("Seed complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
