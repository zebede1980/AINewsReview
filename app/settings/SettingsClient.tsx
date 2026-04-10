"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, RefreshCw, Save, Key, Rss, Clock } from "lucide-react";

const BIAS_OPTIONS = ["LEFT", "CENTER_LEFT", "CENTER", "CENTER_RIGHT", "RIGHT"] as const;

interface RSSSource {
  id: string;
  name: string;
  url: string;
  biasLabel: string;
  active: boolean;
  lastFetched: string | null;
}

interface Props {
  hasApiKey: boolean;
  baseUrl: string;
  model: string;
  fetchIntervalHours: string;
  sources: RSSSource[];
}

export function SettingsClient({ hasApiKey: initialHasKey, baseUrl: initialBase, model: initialModel, fetchIntervalHours: initialInterval, sources }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // AI settings
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(initialBase);
  const [model, setModel] = useState(initialModel);
  const [interval, setInterval] = useState(initialInterval);
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saved, setSaved] = useState(false);

  // Source form
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newBias, setNewBias] = useState<string>("CENTER");

  async function fetchModels() {
    setLoadingModels(true);
    try {
      const res = await fetch("/api/settings", { method: "POST" });
      const data = await res.json() as { models: string[] };
      setModels(data.models ?? []);
    } finally {
      setLoadingModels(false);
    }
  }

  useEffect(() => {
    if (initialHasKey) {
      fetchModels();
    }
  }, [initialHasKey]);

  function handleSaveAI() {
    startTransition(async () => {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(apiKey ? { apiKey } : {}),
          baseUrl,
          model,
          fetchIntervalHours: interval,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  }

  function handleAddSource() {
    if (!newName.trim() || !newUrl.trim()) return;
    startTransition(async () => {
      await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), url: newUrl.trim(), biasLabel: newBias }),
      });
      setNewName("");
      setNewUrl("");
      setNewBias("CENTER");
      router.refresh();
    });
  }

  function handleDeleteSource(id: string) {
    startTransition(async () => {
      await fetch(`/api/sources/${id}`, { method: "DELETE" });
      router.refresh();
    });
  }

  async function handleToggleSource(id: string, active: boolean) {
    startTransition(async () => {
      await fetch(`/api/sources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      router.refresh();
    });
  }

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure AI, RSS sources, and fetch schedule.</p>
      </div>

      {/* AI Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4" />
            AI Configuration
          </CardTitle>
          <CardDescription>Connect to nano-gpt.com API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              nano-gpt.com API Key {initialHasKey && <Badge variant="outline" className="text-[10px] ml-1">Saved</Badge>}
            </label>
            <Input
              type="password"
              placeholder={initialHasKey ? "••••••••••• (key saved — enter to update)" : "Enter your API key"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">API Base URL</label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://nano-gpt.com/api/v1"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground block">Model</label>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={fetchModels} disabled={loadingModels}>
                <RefreshCw className={`w-3 h-3 ${loadingModels ? "animate-spin" : ""}`} />
                Refresh Models
              </Button>
            </div>
            {models.length > 0 ? (
              <Select value={model} onValueChange={(v) => setModel(v ?? model)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o"
              />
            )}
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Fetch Interval (hours)
            </label>
            <Input
              type="number"
              min="1"
              max="24"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="w-24"
            />
          </div>

          <Button onClick={handleSaveAI} disabled={isPending} size="sm" className="gap-2">
            <Save className="w-4 h-4" />
            {saved ? "Saved!" : "Save Settings"}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* RSS Sources */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Rss className="w-4 h-4" />
            RSS Sources
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Add or remove news outlets. Set their political bias label to aid analysis.
          </p>
        </div>

        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-[1fr_2fr_auto_auto] gap-2 items-end">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="BBC News" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">RSS URL</label>
                <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Bias</label>
                <Select value={newBias} onValueChange={(v) => setNewBias(v ?? newBias)}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BIAS_OPTIONS.map((b) => (
                      <SelectItem key={b} value={b}>{b.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                onClick={handleAddSource}
                disabled={!newName.trim() || !newUrl.trim() || isPending}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {sources.map((source) => (
            <div
              key={source.id}
              className={`flex items-center justify-between gap-3 p-3 rounded-lg border border-border/50 bg-card ${!source.active ? "opacity-60" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{source.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {source.biasLabel.replace("_", " ")}
                  </Badge>
                  {!source.active && <Badge variant="outline" className="text-[10px]">Disabled</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{source.url}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => handleToggleSource(source.id, source.active)}
                  disabled={isPending}
                >
                  {source.active ? "Disable" : "Enable"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteSource(source.id)}
                  disabled={isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
