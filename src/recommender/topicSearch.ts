import { normalizeLimit, requireNonEmpty } from "../shared/validation.js";
import type { LuoguGateway, ProblemSummary, SearchResults } from "../types.js";
import { findTopic, topicQueriesFor } from "./topicCatalog.js";

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

/**
 * Search and rank Luogu practice problems for an algorithm topic via an injected LuoguGateway.
 * Runs expanded queries concurrently and processes settled results in deterministic query order.
 */
export async function findTopicProblemsWithGateway(
  gateway: LuoguGateway,
  input: FindTopicProblemsInput
): Promise<FindTopicProblemsResult> {
  const topic = requireNonEmpty(input.topic, "topic");
  const catalogTopic = findTopic(topic);
  const queries = topicQueriesFor(topic);
  const limit = normalizeLimit(input.limit, 8, 30);
  const excluded = new Set((input.excludeProblemIds ?? []).map((id) => id.trim().toUpperCase()).filter(Boolean));
  const seen = new Set<string>();
  const items: ProblemSummary[] = [];

  const settled = await Promise.allSettled(
    queries.map((query) =>
      gateway.searchProblems({ keyword: query, tagIds: catalogTopic?.tagIds })
    )
  );

  let firstError: unknown;
  let hasError = false;

  for (let index = 0; index < queries.length; index += 1) {
    const query = queries[index];
    const outcome = settled[index];
    if (outcome.status === "rejected") {
      if (!hasError) {
        firstError = outcome.reason;
        hasError = true;
      }
      continue;
    }

    const results: SearchResults<ProblemSummary> = outcome.value;
    for (const item of results.items) {
      const id = item.id.toUpperCase();
      if (seen.has(id) || excluded.has(id)) {
        continue;
      }
      seen.add(id);
      items.push({ ...item, reason: `matched query: ${query}` });
    }
  }

  // Propagate upstream error if all queries failed or if partial failure yielded zero matches.
  if (hasError && items.length === 0) {
    throw firstError;
  }

  return {
    topic,
    canonicalTopic: catalogTopic?.name,
    queriesTried: queries,
    items: rankTopicProblems(items, topic, catalogTopic?.name, queries).slice(0, limit),
  };
}

/** Rank candidate problems deterministically using title relevance, template preference, and difficulty. */
export function rankTopicProblems(
  items: ProblemSummary[],
  topic: string,
  canonicalTopic: string | undefined,
  queries: string[]
): ProblemSummary[] {
  return [...items].sort(
    (left, right) =>
      scoreTopicProblem(right, topic, canonicalTopic, queries) -
      scoreTopicProblem(left, topic, canonicalTopic, queries)
  );
}

/** Score a candidate problem for teaching-oriented topic discovery. */
export function scoreTopicProblem(
  item: ProblemSummary,
  topic: string,
  canonicalTopic: string | undefined,
  queries: string[]
): number {
  const title = item.title.toLowerCase();
  const topicNeedles = [topic, canonicalTopic, ...queries]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
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
