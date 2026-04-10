import { SettingsClient } from "./SettingsClient";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, sources] = await Promise.all([
    db.appSetting.findMany(),
    db.rSSSource.findMany({ orderBy: { name: "asc" } }),
  ]);

  const settingMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return (
    <SettingsClient
      hasApiKey={!!settingMap["ai.apiKey"]}
      baseUrl={settingMap["ai.baseUrl"] ?? "https://nano-gpt.com/api/v1"}
      model={settingMap["ai.model"] ?? "gpt-4o"}
      fetchIntervalHours={settingMap["fetch.intervalHours"] ?? "1"}
      sources={JSON.parse(JSON.stringify(sources))}
    />
  );
}
