"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BiasBar } from "@/components/BiasBar";
import { ArrowLeft, Sparkles, Loader2, ExternalLink, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "@/lib/format";

interface Source {
  id: string;
  name: string;
  biasLabel: string;
}

interface Article {
  id: string;
  title: string;
  url: string;
  description: string;
  publishedAt: string | null;
  source: Source;
}

interface Analysis {
  id: string;
  headline: string;
  coreFacts: string; // JSON
  biasReport: string; // JSON
  probableTruth: string;
  analyzedAt: string;
}

interface StoryProps {
  story: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    topic: { name: string };
    analysis: Analysis | null;
    articles: Array<{ article: Article }>;
  };
}

export function StoryDetailClient({ story }: StoryProps) {
  const router = useRouter();
  const [analyzing, startAnalyze] = useTransition();
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const analysis = story.analysis;
  const coreFacts: string[] = analysis ? JSON.parse(analysis.coreFacts) : [];
  const biasReport: Record<string, { name: string; bias: string; summary: string; score: number }> =
    analysis ? JSON.parse(analysis.biasReport) : {};

  const uniqueSources = Array.from(
    new Map(story.articles.map((a) => [a.article.source.id, a.article.source])).values()
  );

  function handleAnalyze() {
    setAnalyzeError(null);
    startAnalyze(async () => {
      const res = await fetch(`/api/stories/${story.id}/analyze`, { method: "POST" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json() as { error?: string };
        setAnalyzeError(data.error ?? "Analysis failed — unknown error.");
      }
    });
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{story.topic.name}</Badge>
            <Badge
              variant="outline"
              className={
                story.status === "ANALYZED"
                  ? "border-green-500 text-green-500"
                  : story.status === "FAILED"
                  ? "border-red-500 text-red-500"
                  : story.status === "ANALYZING"
                  ? "border-yellow-500 text-yellow-500"
                  : ""
              }
            >
              {story.status === "ANALYZED" && <CheckCircle2 className="w-3 h-3 mr-1" />}
              {story.status === "FAILED" && <AlertCircle className="w-3 h-3 mr-1" />}
              {story.status === "ANALYZING" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              {story.status}
            </Badge>
          </div>
          <h1 className="text-xl font-bold leading-tight mt-1">
            {analysis?.headline ?? story.title}
          </h1>
          <p className="text-xs text-muted-foreground">
            {uniqueSources.length} sources &middot; {formatDistanceToNow(story.createdAt)}
          </p>
        </div>
        <Button
          onClick={handleAnalyze}
          disabled={analyzing || story.status === "ANALYZING"}
          className="gap-2 shrink-0"
          size="sm"
        >
          {analyzing || story.status === "ANALYZING" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {analysis ? "Re-analyze" : "Analyze"}
        </Button>
      </div>

      {analyzeError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Analysis failed</p>
            <p className="text-xs mt-0.5 opacity-80">{analyzeError}</p>
          </div>
        </div>
      )}

      <Separator />

      <Tabs defaultValue={analysis ? "analysis" : "sources"}>
        <TabsList>
          <TabsTrigger value="analysis" disabled={!analysis}>
            <ShieldCheck className="w-4 h-4 mr-1.5" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="sources">
            Sources ({uniqueSources.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Analysis tab ── */}
        <TabsContent value="analysis" className="space-y-5 mt-4">
          {analysis ? (
            <>
              {/* Probable Truth */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    Probable Truth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{analysis.probableTruth}</p>
                  <p className="text-xs text-muted-foreground mt-3">
                    Analyzed {formatDistanceToNow(analysis.analyzedAt)}
                  </p>
                </CardContent>
              </Card>

              {/* Core Facts */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Core Facts</CardTitle>
                  <p className="text-xs text-muted-foreground">Facts agreed upon by multiple sources</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {coreFacts.map((fact, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Bias Report */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Source Bias Analysis</CardTitle>
                  <p className="text-xs text-muted-foreground">How each outlet framed the story</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    {Object.entries(biasReport).map(([sourceId, entry]) => (
                      <div key={sourceId} className="space-y-1.5">
                        <BiasBar
                          score={entry.score}
                          biasLabel={entry.bias}
                          sourceName={entry.name}
                          summary={entry.summary}
                        />
                        {Object.values(biasReport).indexOf(entry) < Object.values(biasReport).length - 1 && (
                          <Separator className="mt-4" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Sparkles className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Click &ldquo;Analyze&rdquo; to run AI analysis on this story.
              </p>
            </div>
          )}
        </TabsContent>

        {/* ── Sources tab ── */}
        <TabsContent value="sources" className="mt-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-3 pr-4">
              {story.articles.map(({ article }) => (
                <Card key={article.id} className="border-border/50">
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            {article.source.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {article.source.biasLabel.replace("_", " ")}
                          </span>
                          {article.publishedAt && (
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(article.publishedAt)}
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium text-sm leading-snug">{article.title}</h3>
                        {article.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {article.description}
                          </p>
                        )}
                      </div>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 p-1 hover:text-primary transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
