/**
 * Adds new RSS sources and topics to the existing database without wiping anything.
 * Run: npx tsx scripts/add-sources.ts
 */
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./data/dev.db" }),
});

const newSources = [
  // Sports
  { name: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/rss.xml", biasLabel: "CENTER" },
  { name: "BBC Sport – Football", url: "https://feeds.bbci.co.uk/sport/football/rss.xml", biasLabel: "CENTER" },
  { name: "BBC Sport – Rugby Union", url: "https://feeds.bbci.co.uk/sport/rugby-union/rss.xml", biasLabel: "CENTER" },
  { name: "BBC Sport – Cricket", url: "https://feeds.bbci.co.uk/sport/cricket/rss.xml", biasLabel: "CENTER" },
  { name: "BBC Sport – Tennis", url: "https://feeds.bbci.co.uk/sport/tennis/rss.xml", biasLabel: "CENTER" },
  { name: "Sky Sports", url: "https://www.skysports.com/rss/12040", biasLabel: "CENTER" },
  { name: "The Guardian – Sport", url: "https://www.theguardian.com/sport/rss", biasLabel: "CENTER_LEFT" },
  { name: "Reuters – Sports", url: "https://feeds.reuters.com/reuters/sportsNews", biasLabel: "CENTER" },
  // Better general UK sources
  { name: "BBC News – UK", url: "https://feeds.bbci.co.uk/news/uk/rss.xml", biasLabel: "CENTER_LEFT" },
  { name: "The Guardian – UK", url: "https://www.theguardian.com/uk-news/rss", biasLabel: "CENTER_LEFT" },
  { name: "The Guardian – World", url: "https://www.theguardian.com/world/rss", biasLabel: "CENTER_LEFT" },
  { name: "Sky News", url: "https://feeds.skynews.com/feeds/rss/home.xml", biasLabel: "CENTER" },
  { name: "The Independent", url: "https://www.independent.co.uk/rss", biasLabel: "CENTER_LEFT" },
  // Business & tech
  { name: "BBC News – Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", biasLabel: "CENTER_LEFT" },
  { name: "BBC News – Technology", url: "https://feeds.bbci.co.uk/news/technology/rss.xml", biasLabel: "CENTER_LEFT" },
  { name: "Reuters – Technology", url: "https://feeds.reuters.com/reuters/technologyNews", biasLabel: "CENTER" },
  { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", biasLabel: "CENTER_LEFT" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", biasLabel: "CENTER_LEFT" },
];

const newTopics = [
  {
    name: "Football",
    keywords: JSON.stringify([
      "football", "premier league", "champions league", "fa cup", "soccer",
      "arsenal", "chelsea", "liverpool", "manchester united", "manchester city",
      "tottenham", "goal", "transfer", "manager", "fifa", "euro",
    ]),
  },
  {
    name: "Rugby",
    keywords: JSON.stringify([
      "rugby", "six nations", "premiership rugby", "rugby union", "rugby league",
      "leicester tigers", "northampton", "bath rugby", "leinster", "try", "scrum",
      "world cup rugby", "lions", "england rugby",
    ]),
  },
  {
    name: "Cricket",
    keywords: JSON.stringify([
      "cricket", "ashes", "test match", "one day", "odi", "t20", "batting", "bowling",
      "wicket", "innings", "england cricket", "ecb", "icc",
    ]),
  },
  {
    name: "Sports",
    keywords: JSON.stringify([
      "sport", "sports", "championship", "tournament", "match", "game",
      "athletics", "wimbledon", "tennis", "golf", "formula 1", "f1", "nba",
      "nfl", "nhl", "mlb", "olympic", "paralympic",
    ]),
  },
  {
    name: "UK News",
    keywords: JSON.stringify([
      "uk", "britain", "british", "england", "scotland", "wales",
      "parliament", "westminster", "labour", "tory", "conservative",
      "prime minister", "nhs", "sunak", "starmer",
    ]),
  },
  {
    name: "Business & Economy",
    keywords: JSON.stringify([
      "economy", "gdp", "inflation", "interest rate", "bank of england",
      "federal reserve", "stock market", "shares", "ftse", "dow jones",
      "recession", "budget", "trade", "tariff", "finance",
    ]),
  },
  {
    name: "Technology",
    keywords: JSON.stringify([
      "technology", "tech", "software", "hardware", "startup", "google",
      "apple", "microsoft", "meta", "amazon", "cybersecurity", "hack",
      "data breach", "chip", "semiconductor", "robotics",
    ]),
  },
];

async function main() {
  let addedSources = 0;
  for (const source of newSources) {
    const result = await db.rSSSource.upsert({
      where: { url: source.url },
      update: {},
      create: source,
    });
    if (result) addedSources++;
  }

  // Update The Guardian plain /world/rss to use the full news feed instead
  await db.rSSSource.updateMany({
    where: { url: "https://www.theguardian.com/world/rss" },
    data: { name: "The Guardian – (old world feed)" },
  });

  let addedTopics = 0;
  for (const topic of newTopics) {
    await db.topic.upsert({
      where: { name: topic.name },
      update: { keywords: topic.keywords, active: true },
      create: topic,
    });
    addedTopics++;
  }

  const totalSources = await db.rSSSource.count();
  const totalTopics = await db.topic.count();
  console.log(`Done. DB now has ${totalSources} sources, ${totalTopics} topics.`);
  await db.$disconnect();
}

main().catch(console.error);
