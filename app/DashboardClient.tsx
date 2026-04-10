"use client";

import { useState, useTransition } from "react";
import { StoryCard } from "@/components/StoryCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Wifi } from "lucide-react";
import { useRouter } from "next/navigation";

interface Topic {
  id: string;
  name: string;
}

interface StoryData {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  topic: { name: string };
  analysis?: { headline: string; probableTruth: string; analyzedAt: string; biasReport?: string } | null;
  articles: Array<{ article: { source: { name: string; biasLabel: string } } }>;
}

interface Props {
  stories: StoryData[];
  topics: Topic[];
}

export function DashboardClient({ stories, topics }: Props) {
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [fetching, startFetch] = useTransition();
  const router = useRouter();

  const filtered = activeTopic
    ? stories.filter((s) => s.topic.name === activeTopic)
    : stories;

  async function handleFetch() {
    startFetch(async () => {
      await fetch("/api/fetch", { method: "POST" });
      router.refresh();
    });
  }

  const analyzed = stories.filter((s) => s.status === "ANALYZED").length;
  const pending = stories.filter((s) => s.status === "PENDING").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {stories.length} stories &middot; {analyzed} analyzed &middot; {pending} pending
          </p>
        </div>
        <Button
          onClick={handleFetch}
          disabled={fetching}
          size="sm"
          className="gap-2"
        >
          {fetching ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Wifi className="w-4 h-4" />
          )}
          {fetching ? "Fetching…" : "Fetch News"}
        </Button>
      </div>

      {/* Topic filter */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={activeTopic === null ? "default" : "secondary"}
          className="cursor-pointer"
          onClick={() => setActiveTopic(null)}
        >
          All Topics
        </Badge>
        {topics.map((t) => (
          <Badge
            key={t.id}
            variant={activeTopic === t.name ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => setActiveTopic(activeTopic === t.name ? null : t.name)}
          >
            {t.name}
          </Badge>
        ))}
      </div>

      {/* Stories grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Wifi className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">No stories yet</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Click &ldquo;Fetch News&rdquo; to pull articles from your RSS sources, or{" "}
            add topics in the Topics page first.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}
    </div>
  );
}
