"use client";

import { useState, useTransition } from "react";
import { StoryCard } from "@/components/StoryCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Search, Wifi } from "lucide-react";
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

interface SearchResultItem {
  title: string;
  url: string;
  description: string;
  publishedAt: string | null;
  sourceName: string;
  sourceUrl: string;
  score: number;
}

export function DashboardClient({ stories, topics }: Props) {
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [fetching, startFetch] = useTransition();
  const [searching, startSearch] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
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

  async function handleSearch() {
    const q = searchQuery.trim();
    if (!q) return;

    setSearchError(null);
    startSearch(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=30`);
        const data = await res.json() as { results?: SearchResultItem[]; error?: string };

        if (!res.ok) {
          setSearchResults([]);
          setSearchError(data.error ?? "Search failed.");
          return;
        }

        setSearchResults(data.results ?? []);
      } catch {
        setSearchResults([]);
        setSearchError("Unable to search feeds right now.");
      }
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

      {/* Live feed search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4" />
            Search News Feeds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Try: artificial general intelligence, ukraine, chip export rules"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handleSearch();
                }
              }}
            />
            <Button
              onClick={() => void handleSearch()}
              disabled={searching || !searchQuery.trim()}
              className="gap-2"
            >
              {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {searching ? "Searching..." : "Search"}
            </Button>
          </div>

          {searchError && (
            <p className="text-sm text-destructive">{searchError}</p>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((item) => (
                <a
                  key={item.url}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-md border border-border/60 p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">{item.sourceName}</Badge>
                    {item.publishedAt && (
                      <span className="text-[11px] text-muted-foreground">{new Date(item.publishedAt).toLocaleString()}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium line-clamp-2">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                  )}
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
