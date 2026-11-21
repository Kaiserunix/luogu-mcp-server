import { normalizeLimit, normalizeProblemId } from "../shared/validation.js";
import type { LuoguGateway, ProblemSummary } from "../types.js";
import { recommendProblems, type RecommendProblemsInput } from "./seedRecommender.js";
import { findTopicProblemsWithGateway } from "./topicSearch.js";

export interface FindRelatedProblemsInput extends RecommendProblemsInput {
  query?: string;
  pid?: string;
}

export interface FindRelatedProblemsResult {
  query?: string;
  pid?: string;
  topic?: string;
  painPoint?: string;
  searchHints: string[];
  items: ProblemSummary[];
}

/**
 * Combine offline seed recommendations, topic alias search, optional pid context extraction,
 * and live keyword fallback while excluding both currentProblemId and pid across all stages.
 */
export async function findRelatedProblemsWithGateway(
  gateway: LuoguGateway,
  input: FindRelatedProblemsInput
): Promise<FindRelatedProblemsResult> {
  const limit = normalizeLimit(input.limit, 5, 20);
  const excludedIds = buildExcludedSet(input.currentProblemId, input.pid);
  const recommendations = recommendProblems({ ...input, limit });
  const items = recommendations.items.filter((item) => !excludedIds.has(item.id.toUpperCase()));
  const hints = [...recommendations.searchHints];

  if (input.topic && !hints.includes(input.topic)) {
    hints.push(input.topic);
  }

  if (items.length < limit && input.topic) {
    const topicResult = await findTopicProblemsWithGateway(gateway, {
      topic: input.topic,
      limit,
      excludeProblemIds: [...excludedIds, ...items.map((item) => item.id)],
    });
    appendUniqueItems(items, topicResult.items, excludedIds, limit);
  }

  let derivedQuery: string | undefined;
  if (items.length < limit && !input.query && !input.topic && !input.painPoint && input.pid?.trim()) {
    derivedQuery = await deriveQueryFromProblem(gateway, input.pid, hints);
  }

  const searchQuery = input.query?.trim() || hints[0] || derivedQuery || input.pid?.trim();
  if (items.length < limit && searchQuery) {
    const search = await gateway.searchProblems({ keyword: searchQuery, page: 1 });
    appendUniqueItems(items, search.items, excludedIds, limit);
  }

  return {
    query: input.query,
    pid: input.pid,
    topic: input.topic,
    painPoint: input.painPoint,
    searchHints: hints,
    items,
  };
}

function buildExcludedSet(currentProblemId?: string, pid?: string): Set<string> {
  const excluded = new Set<string>();
  for (const candidate of [currentProblemId, pid]) {
    const trimmed = candidate?.trim();
    if (trimmed) {
      excluded.add(normalizeProblemId(trimmed).toUpperCase());
    }
  }
  return excluded;
}

function appendUniqueItems(
  target: ProblemSummary[],
  candidates: ProblemSummary[],
  excludedIds: Set<string>,
  limit: number
): void {
  const seen = new Set(target.map((item) => item.id.toUpperCase()));
  for (const candidate of candidates) {
    const id = candidate.id.toUpperCase();
    if (excludedIds.has(id) || seen.has(id)) {
      continue;
    }
    seen.add(id);
    target.push(candidate);
    if (target.length >= limit) {
      break;
    }
  }
}

async function deriveQueryFromProblem(
  gateway: LuoguGateway,
  rawPid: string,
  hints: string[]
): Promise<string | undefined> {
  try {
    const problem = await gateway.fetchProblem(normalizeProblemId(rawPid));
    const titleWords = problem.title
      .replace(/\[[^\]]*\]|【[^】]*】/g, " ")
      .trim();
    const fallbackTag = problem.tags.find((tag) => !/^\d+$/.test(tag.trim()));
    const derived = titleWords || fallbackTag;
    if (derived && !hints.includes(derived)) {
      hints.push(derived);
    }
    return derived || undefined;
  } catch {
    return undefined;
  }
}
