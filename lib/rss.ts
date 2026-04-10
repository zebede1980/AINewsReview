import Parser from "rss-parser";
import { db } from "./db";

const parser = new Parser({
  timeout: 10000,
  headers: { "User-Agent": "NewsAnalyzer/1.0" },
  customFields: {
    item: [
      ["content:encoded", "contentEncoded"],
      ["description", "description"],
    ],
  },
});

export interface FeedSearchResult {
  title: string;
  url: string;
  description: string;
  publishedAt: string | null;
  sourceName: string;
  sourceUrl: string;
  score: number;
}

function tokenizeSearchQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1);
}

function scoreSearchMatch(text: string, terms: string[]): number {
  if (!terms.length) return 0;

  const haystack = text.toLowerCase();
  let termHits = 0;
  for (const term of terms) {
    if (haystack.includes(term)) {
      termHits += 1;
    }
  }

  if (termHits === 0) {
    return 0;
  }

  // Bias toward items that mention more query terms.
  return termHits / terms.length;
}

export async function searchNewsFeeds(query: string, limit = 30): Promise<FeedSearchResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const terms = tokenizeSearchQuery(trimmedQuery);
  if (!terms.length) {
    return [];
  }

  const activeSources = await db.rSSSource.findMany({
    where: { active: true },
    select: { name: true, url: true },
  });

  const externalSearchFeeds = [
    {
      name: "Google News",
      url: `https://news.google.com/rss/search?q=${encodeURIComponent(trimmedQuery)}&hl=en-US&gl=US&ceid=US:en`,
    },
  ];

  const searchableSources = [...activeSources, ...externalSearchFeeds];

  const perSourceResults = await Promise.all(
    searchableSources.map(async (source) => {
      try {
        const feed = await parser.parseURL(source.url);
        const items = feed.items ?? [];

        const matches: FeedSearchResult[] = [];
        for (const item of items.slice(0, 80)) {
          if (!item.link || !item.title) continue;

          const combinedText = `${item.title} ${item.contentSnippet ?? ""} ${item.content ?? ""}`;
          const score = scoreSearchMatch(combinedText, terms);
          if (score <= 0) continue;

          matches.push({
            title: item.title,
            url: item.link,
            description: item.contentSnippet ?? item.description ?? "",
            publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : null,
            sourceName: source.name,
            sourceUrl: source.url,
            score,
          });
        }

        return matches;
      } catch (err) {
        console.error(`[RSS search] Source failed (${source.name}):`, err instanceof Error ? err.message : err);
        return [] as FeedSearchResult[];
      }
    })
  );

  const uniqueByUrl = new Map<string, FeedSearchResult>();
  for (const result of perSourceResults.flat()) {
    const existing = uniqueByUrl.get(result.url);
    if (!existing || result.score > existing.score) {
      uniqueByUrl.set(result.url, result);
    }
  }

  return [...uniqueByUrl.values()]
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, Math.max(1, Math.min(limit, 100)));
}

export async function fetchAllSources() {
  const sources = await db.rSSSource.findMany({ where: { active: true } });
  const topics = await db.topic.findMany({ where: { active: true } });

  let totalNew = 0;

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.url);
      const items = feed.items ?? [];
      console.log(`  [RSS] ${source.name}: ${items.length} items`);
      for (const item of items) {
        if (!item.link || !item.title) continue;

        // Determine if the article matches any topic
        const itemText = `${item.title} ${item.contentSnippet ?? ""} ${item.content ?? ""}`.toLowerCase();
        let matchedTopicId: string | null = null;

        for (const topic of topics) {
          const keywords: string[] = JSON.parse(topic.keywords);
          const matches = keywords.some((kw) => itemText.includes(kw.toLowerCase()));
          if (matches) {
            matchedTopicId = topic.id;
            break;
          }
        }

        try {
          await db.article.upsert({
            where: { url: item.link },
            update: {},
            create: {
              sourceId: source.id,
              topicId: matchedTopicId,
              title: item.title,
              url: item.link,
              description: item.contentSnippet ?? item.description ?? "",
              content: (item as unknown as Record<string, string>).contentEncoded ?? item.content ?? item.contentSnippet ?? "",
              publishedAt: item.pubDate ? new Date(item.pubDate) : null,
            },
          });
          totalNew++;
        } catch {
          // Duplicate URL — skip
        }
      }

      await db.rSSSource.update({
        where: { id: source.id },
        data: { lastFetched: new Date() },
      });
    } catch (err) {
      console.error(`RSS fetch error for ${source.name}:`, err instanceof Error ? err.message : err);
    }
  }

  return totalNew;
}

export async function groupArticlesIntoStories() {
  const topics = await db.topic.findMany({ where: { active: true } });
  const storiesCreated: string[] = [];

  for (const topic of topics) {
    const articles = await db.article.findMany({
      where: { topicId: topic.id },
      orderBy: { fetchedAt: "desc" },
      select: { id: true, sourceId: true, title: true, publishedAt: true, fetchedAt: true },
      take: 500,
    });

    if (articles.length < 2) continue;

    const clusters = clusterBySimilarity(articles);

    for (const cluster of clusters) {
      if (cluster.length < 2) continue;

      // Skip if any article in this cluster already belongs to a story
      const articleIds = cluster.map((a) => a.id);
      const existing = await db.storyArticle.findFirst({
        where: { articleId: { in: articleIds } },
      });
      if (existing) continue;

      // Use the article with the most title words as the story title
      const titleArticle = cluster.reduce((best, a) =>
        significantWords(a.title).size > significantWords(best.title).size ? a : best
      );

      const story = await db.story.create({
        data: {
          topicId: topic.id,
          title: titleArticle.title,
          status: "PENDING",
          articles: {
            create: cluster.map((a) => ({ articleId: a.id })),
          },
        },
      });
      storiesCreated.push(story.id);
    }
  }

  return storiesCreated;
}

type ArticleForCluster = { id: string; sourceId: string; title: string; publishedAt: Date | null; fetchedAt: Date };

// Words to ignore when comparing titles — too common to be useful as matching signals
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "up", "as", "is", "was", "are", "were",
  "be", "been", "has", "have", "had", "do", "did", "will", "would",
  "could", "should", "may", "might", "that", "this", "it", "its",
  "after", "over", "amid", "into", "than", "more", "new", "about",
  "says", "said", "out", "how", "what", "who", "why", "when", "where",
  // Sports generics — too broad to be useful for matching
  "win", "wins", "beat", "beats", "beaten", "loss", "lose", "loses",
  "draw", "draws", "match", "game", "play", "plays", "played",
  "score", "scores", "scored", "goal", "goals", "point", "points",
  "first", "second", "third", "last", "next", "back", "top",
  "live", "update", "updates", "latest", "breaking", "report",
  "big", "key", "major", "ahead", "say",
]);

function significantWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}

/**
 * Groups articles that are about the same story using title similarity + time proximity.
 * - Articles must share ≥2 significant title words AND ≥20% Jaccard overlap
 * - OR share ≥3 significant words (relaxed for sports where phrasing varies widely)
 * - Articles must be published within 72 hours of each other
 * - Minimum cluster size: 2
 */
function clusterBySimilarity(articles: ArticleForCluster[]): ArticleForCluster[][] {
  const TIME_WINDOW_HOURS = 72;
  const MIN_JACCARD = 0.20;       // lowered from 0.25
  const MIN_SHARED_WORDS = 2;
  const MIN_SHARED_WORDS_RELAXED = 3; // bypass Jaccard check if this many words shared

  // Precompute significant word sets
  const wordSets = new Map(articles.map((a) => [a.id, significantWords(a.title)]));

  const used = new Set<string>();
  const clusters: ArticleForCluster[][] = [];

  // Sort by publication date descending (most recent first)
  const sorted = [...articles].sort((a, b) => {
    const ta = (a.publishedAt ?? a.fetchedAt).getTime();
    const tb = (b.publishedAt ?? b.fetchedAt).getTime();
    return tb - ta;
  });

  for (const anchor of sorted) {
    if (used.has(anchor.id)) continue;

    const anchorWords = wordSets.get(anchor.id)!;
    const anchorTime = (anchor.publishedAt ?? anchor.fetchedAt).getTime();
    const cluster: ArticleForCluster[] = [anchor];
    used.add(anchor.id);

    for (const candidate of sorted) {
      if (used.has(candidate.id)) continue;

      const candidateTime = (candidate.publishedAt ?? candidate.fetchedAt).getTime();
      const diffHours = Math.abs(candidateTime - anchorTime) / 3_600_000;

      if (diffHours > TIME_WINDOW_HOURS) continue;

      const candidateWords = wordSets.get(candidate.id)!;

      // Must share minimum number of actual words
      const sharedCount = [...anchorWords].filter((w) => candidateWords.has(w)).length;
      if (sharedCount < MIN_SHARED_WORDS) continue;

      // Require more overlap when anchor title is very short (avoids "Tech Life" type matches)
      const minJaccardRequired = anchorWords.size <= 2 ? 0.9 : MIN_JACCARD;

      const similarity = jaccardSimilarity(anchorWords, candidateWords);
      // Accept if: Jaccard overlap met, OR enough raw shared words (relaxed for sports)
      if (similarity >= minJaccardRequired || (sharedCount >= MIN_SHARED_WORDS_RELAXED && similarity >= 0.10)) {
        cluster.push(candidate);
        used.add(candidate.id);
      }
    }

    // De-duplicate: keep at most one article per source per story
    const seenSources = new Set<string>();
    const deduped: ArticleForCluster[] = [];
    for (const a of cluster) {
      if (!seenSources.has(a.sourceId)) {
        seenSources.add(a.sourceId);
        deduped.push(a);
      }
    }

    if (deduped.length >= 2) {
      clusters.push(deduped);
    }
  }

  return clusters;
}
