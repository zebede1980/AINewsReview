"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BiasBar } from "@/components/BiasBar";
import { Clock, Newspaper, CheckCircle2, AlertCircle, Loader2, Circle } from "lucide-react";
import { formatDistanceToNow } from "@/lib/format";

interface StoryCardProps {
  story: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    topic: { name: string };
    analysis?: {
      headline: string;
      probableTruth: string;
      analyzedAt: string;
      biasReport?: string;
    } | null;
    articles: Array<{
      article: {
        source: { name: string; biasLabel: string };
      };
    }>;
  };
}

const STATUS_ICONS = {
  ANALYZED: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  ANALYZING: <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />,
  FAILED: <AlertCircle className="w-4 h-4 text-red-500" />,
  PENDING: <Circle className="w-4 h-4 text-muted-foreground" />,
};

export function StoryCard({ story }: StoryCardProps) {
  const uniqueSources = Array.from(
    new Map(story.articles.map((a) => [a.article.source.name, a.article.source])).values()
  );

  const biasReport = story.analysis?.biasReport
    ? (JSON.parse(story.analysis.biasReport) as Record<string, { name: string; bias: string; score: number; summary: string }>)
    : null;

  const avgScore = biasReport
    ? Object.values(biasReport).reduce((s, e) => s + e.score, 0) / Object.values(biasReport).length
    : null;

  return (
    <Link href={`/story/${story.id}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-border/50 bg-card hover:bg-card/80">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {STATUS_ICONS[story.status as keyof typeof STATUS_ICONS] ?? STATUS_ICONS.PENDING}
                <Badge variant="secondary" className="text-xs">
                  {story.topic.name}
                </Badge>
              </div>
              <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                {story.analysis?.headline ?? story.title}
              </h3>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {story.analysis?.probableTruth && (
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
              {story.analysis.probableTruth}
            </p>
          )}

          {avgScore !== null && (
            <div className="pt-1">
              <BiasBar
                score={avgScore}
                sourceName="Overall Story Slant"
                compact
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Newspaper className="w-3 h-3" />
              <span>{uniqueSources.length} source{uniqueSources.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(story.createdAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {uniqueSources.slice(0, 4).map((s) => (
              <span key={s.name} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {s.name}
              </span>
            ))}
            {uniqueSources.length > 4 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                +{uniqueSources.length - 4} more
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
