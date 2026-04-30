import { findTopic, topicQueriesFor } from "./topicCatalog.js";
import { LuoguClient } from "./luoguClient.js";
import type { ProblemSummary } from "./types.js";

export interface FindTopicProblemsInput {
  topic: string;
  limit?: number;
  excludeProblemIds?: string[];
}

export interface FindTopicProblemsResult {
  topic: string;
  canonicalTopic?: string;
  queriesTried: string[];
  items: ProblemSummary[];
}

export async function findTopicProblems(input: FindTopicProblemsInput, fetchImpl?: typeof fetch): Promise<FindTopicProblemsResult> {
  const topic = input.topic.trim();
  if (!topic) {
    throw new Error("topic is required.");
  }

  const catalogTopic = findTopic(topic);
  const queries = topicQueriesFor(topic);
  const limit = normalizeLimit(input.limit, 8, 30);
  const excluded = new Set((input.excludeProblemIds ?? []).map((id) => id.toUpperCase()));
  const seen = new Set<string>();
  const items: ProblemSummary[] = [];
  const client = new LuoguClient({ fetchImpl });

  for (const query of queries) {
    const results = await client.searchProblems({ keyword: query, tagIds: catalogTopic?.tagIds });
    for (const item of results.items) {
      const id = item.id.toUpperCase();
      if (seen.has(id) || excluded.has(id)) {
        continue;
      }
      seen.add(id);
      items.push({ ...item, reason: `matched query: ${query}` });
    }
  }

  return {
    topic,
    canonicalTopic: catalogTopic?.name,
    queriesTried: queries,
    items: rankProblems(items, topic, catalogTopic?.name, queries).slice(0, limit)
  };
}

function normalizeLimit(value: number | undefined, fallback: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(1, Math.min(Math.floor(value), max));
}

function rankProblems(items: ProblemSummary[], topic: string, canonicalTopic: string | undefined, queries: string[]): ProblemSummary[] {
  return [...items].sort((left, right) => scoreProblem(right, topic, canonicalTopic, queries) - scoreProblem(left, topic, canonicalTopic, queries));
}

function scoreProblem(item: ProblemSummary, topic: string, canonicalTopic: string | undefined, queries: string[]): number {
  const title = item.title.toLowerCase();
  const topicNeedles = [topic, canonicalTopic, ...queries].filter((value): value is string => Boolean(value)).map((value) => value.toLowerCase());
  const hasTitleNeedle = topicNeedles.some((needle) => needle && title.includes(needle));
  let score = 0;

  if (hasTitleNeedle) {
    score += 20;
  }
  if (title.includes("模板") && hasTitleNeedle) {
    score += 30;
  }
  if (title.includes("普通平衡树")) {
    score += 25;
  }
  if (typeof item.difficulty === "number" && item.difficulty >= 1 && item.difficulty <= 5) {
    score += 5;
  }
  if (typeof item.difficulty === "number" && item.difficulty >= 6) {
    score -= 4;
  }

  return score;
}
