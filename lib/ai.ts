import OpenAI from "openai";
import { db } from "./db";

async function getAISettings() {
  const settings = await db.appSetting.findMany({
    where: { key: { in: ["ai.apiKey", "ai.baseUrl", "ai.model"] } },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return {
    apiKey: map["ai.apiKey"] ?? "",
    baseUrl: map["ai.baseUrl"] ?? "https://nano-gpt.com/api/v1",
    model: map["ai.model"] ?? "gpt-4o",
  };
}

export async function getAvailableModels(): Promise<string[]> {
  const { apiKey, baseUrl } = await getAISettings();
  if (!apiKey) return [];

  const client = new OpenAI({ apiKey, baseURL: baseUrl });
  try {
    const models = await client.models.list();
    return models.data.map((m) => m.id).sort();
  } catch {
    return [];
  }
}

export interface BiasEntry {
  name: string;
  bias: string;
  summary: string;
  score: number; // -2 (strongly left) to +2 (strongly right)
}

export interface AnalysisResult {
  headline: string;
  coreFacts: string[];
  biasReport: Record<string, BiasEntry>;
  probableTruth: string;
}

const ANALYSIS_PROMPT = `You are an expert media analyst tasked with comparing multiple news articles covering the same story.

You will receive articles from different outlets. Your job is to:
1. Extract the CORE FACTS that all (or most) sources agree on
2. Assess the bias/framing of each source (LEFT | CENTER_LEFT | CENTER | CENTER_RIGHT | RIGHT)
3. Score each source's slant numerically: -2 (strong left lean), -1 (slight left), 0 (neutral), +1 (slight right), +2 (strong right)
4. Write a short, neutral summary per source highlighting what they emphasise or omit
5. Synthesise a "probable truth" — the most factual, unbiased account of what likely happened
6. Generate a neutral headline for the story

Respond ONLY with valid JSON matching this exact shape:
{
  "headline": "string",
  "coreFacts": ["fact1", "fact2", ...],
  "biasReport": {
    "<sourceId>": {
      "name": "Source Name",
      "bias": "CENTER_LEFT",
      "summary": "Short description of how this source covered the story and what angle they took",
      "score": -1
    }
  },
  "probableTruth": "A balanced, factual narrative of what appears to have actually happened, based on the consensus across sources."
}`;

export async function analyzeStory(storyId: string): Promise<AnalysisResult> {
  const { apiKey, baseUrl, model } = await getAISettings();

  if (!apiKey) {
    throw new Error("AI API key not configured. Please add your NanoGPT API key in Settings.");
  }

  const story = await db.story.findUnique({
    where: { id: storyId },
    include: {
      articles: {
        include: {
          article: {
            include: { source: true },
          },
        },
      },
    },
  });

  if (!story || story.articles.length === 0) {
    throw new Error("Story not found or has no articles.");
  }

  const articleTexts = story.articles
    .map(({ article }) => {
      const text = article.content || article.description;
      return `[SOURCE_ID: ${article.source.id}]
Source Name: ${article.source.name}
Known Bias Label: ${article.source.biasLabel}
Title: ${article.title}
Content: ${text.slice(0, 1500)}`;
    })
    .join("\n\n---\n\n");

  const client = new OpenAI({ apiKey, baseURL: baseUrl });

  // Try with json_object response format first; fall back if model doesn't support it
  let raw: string | null = null;
  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: ANALYSIS_PROMPT },
        { role: "user", content: articleTexts },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
    raw = response.choices[0]?.message?.content ?? null;
  } catch (err) {
    // Some models/providers don't support response_format — retry without it
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[AI] response_format not supported (${msg}), retrying without it...`);
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: ANALYSIS_PROMPT },
        { role: "user", content: articleTexts },
      ],
      temperature: 0.3,
    });
    raw = response.choices[0]?.message?.content ?? null;
  }

  if (!raw) throw new Error("Empty response from AI.");

  // Extract JSON — model may wrap it in markdown code fences
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/) ?? raw.match(/(\{[\s\S]+\})/);
  const jsonStr = jsonMatch ? (jsonMatch[1] ?? raw) : raw;

  let result: AnalysisResult;
  try {
    result = JSON.parse(jsonStr) as AnalysisResult;
  } catch {
    throw new Error(`AI returned invalid JSON. Raw response: ${raw.slice(0, 200)}`);
  }

  // Validate structure
  if (!result.coreFacts || !result.biasReport || !result.probableTruth) {
    throw new Error(`AI response missing required fields. Got keys: ${Object.keys(result).join(", ")}`);
  }

  return result;
}
