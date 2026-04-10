"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, X, Tag } from "lucide-react";
import { useRouter } from "next/navigation";

interface Topic {
  id: string;
  name: string;
  keywords: string; // JSON
  active: boolean;
  createdAt: string;
}

interface Props {
  topics: Topic[];
}

export function TopicsClient({ topics }: Props) {
  const [name, setName] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function addKeyword() {
    const kw = keywordInput.trim();
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
      setKeywordInput("");
    }
  }

  function removeKeyword(kw: string) {
    setKeywords(keywords.filter((k) => k !== kw));
  }

  function handleCreate() {
    if (!name.trim() || keywords.length === 0) return;
    startTransition(async () => {
      await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), keywords }),
      });
      setName("");
      setKeywords([]);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await fetch(`/api/topics/${id}`, { method: "DELETE" });
      router.refresh();
    });
  }

  async function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      await fetch(`/api/topics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      router.refresh();
    });
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Topics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define the topics you want to track. Articles matching keywords will be grouped into stories.
        </p>
      </div>

      {/* Add Topic */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Topic
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Topic Name</label>
            <Input
              placeholder="e.g. Climate Change"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Keywords</label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. climate, emissions, net zero"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addKeyword()}
              />
              <Button variant="outline" size="sm" onClick={addKeyword} type="button">
                Add
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {keywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="gap-1">
                    {kw}
                    <button onClick={() => removeKeyword(kw)} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || keywords.length === 0 || isPending}
            size="sm"
          >
            Create Topic
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Topic list */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {topics.length} Topic{topics.length !== 1 ? "s" : ""}
        </h2>
        {topics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Tag className="w-8 h-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No topics yet. Add one above.</p>
          </div>
        ) : (
          topics.map((topic) => {
            const topicKeywords: string[] = JSON.parse(topic.keywords);
            return (
              <Card key={topic.id} className={topic.active ? "" : "opacity-60"}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{topic.name}</span>
                        {!topic.active && (
                          <Badge variant="outline" className="text-xs">Paused</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {topicKeywords.map((kw) => (
                          <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleToggle(topic.id, topic.active)}
                        disabled={isPending}
                      >
                        {topic.active ? "Pause" : "Enable"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(topic.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
