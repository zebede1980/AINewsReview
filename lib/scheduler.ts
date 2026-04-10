import cron, { type ScheduledTask } from "node-cron";
import { fetchAllSources, groupArticlesIntoStories } from "./rss";
import { db } from "./db";

let scheduledTask: ScheduledTask | null = null;

async function getFetchIntervalHours(): Promise<number> {
  const setting = await db.appSetting.findUnique({ where: { key: "fetch.intervalHours" } });
  return parseInt(setting?.value ?? "1", 10);
}

export async function runFetchCycle() {
  console.log("[Scheduler] Starting fetch cycle...");
  try {
    const newArticles = await fetchAllSources();
    console.log(`[Scheduler] Fetched ${newArticles} new articles`);
    const newStories = await groupArticlesIntoStories();
    console.log(`[Scheduler] Created ${newStories.length} new stories`);
  } catch (err) {
    console.error("[Scheduler] Fetch cycle error:", err);
  }
}

export async function startScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
  }

  const hours = await getFetchIntervalHours();
  // Cron: every N hours
  const cronExpr = `0 */${hours} * * *`;

  console.log(`[Scheduler] Starting with interval: every ${hours} hour(s) (${cronExpr})`);

  scheduledTask = cron.schedule(cronExpr, async () => {
    await runFetchCycle();
  });
}

export function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}
