import { LuoguClient } from "./luoguClient.js";
import { recommendProblems, type RecommendProblemsInput } from "./recommendations.js";
import type { ProblemRecord, ProblemSetRecord, ProblemSetSummary, ProblemSummary } from "./types.js";

export interface SearchProblemsInput {
  keyword: string;
  page?: number;
  limit?: number;
}

export interface SearchProblemsResult {
  platform: "luogu";
  query: string;
  page: number;
  total: number;
  items: ProblemSummary[];
}

export interface FetchProblemInput {
  pid: string;
  maxStatementChars?: number;
}

export interface FetchProblemResult extends ProblemRecord {
  truncated: boolean;
}

export interface SearchProblemSetsInput {
  keyword: string;
  page?: number;
  limit?: number;
}

export interface SearchProblemSetsResult {
  platform: "luogu";
  query: string;
  page: number;
  total: number;
  items: ProblemSetSummary[];
}

export interface FetchProblemSetInput {
  id: string;
  limit?: number;
}

export interface FetchProblemSetResult extends ProblemSetRecord {
  truncatedProblemList: boolean;
}

export async function searchProblemsTool(input: SearchProblemsInput, fetchImpl?: typeof fetch): Promise<SearchProblemsResult> {
  const keyword = requireNonEmpty(input.keyword, "keyword");
  const page = normalizePage(input.page);
  const limit = normalizeLimit(input.limit, 8, 30);
  const results = await new LuoguClient({ fetchImpl }).searchProblems({ keyword, page });

  return {
    platform: "luogu",
    query: keyword,
    page,
    total: results.total,
    items: results.items.slice(0, limit)
  };
}

export async function fetchProblemTool(input: FetchProblemInput, fetchImpl?: typeof fetch): Promise<FetchProblemResult> {
  const pid = requireNonEmpty(input.pid, "pid").toUpperCase();
  const maxStatementChars = normalizeLimit(input.maxStatementChars, 5000, 30000);
  const problem = await new LuoguClient({ fetchImpl }).fetchProblem(pid);
  const statement = trimText(problem.statement, maxStatementChars);

  return {
    ...problem,
    statement,
    truncated: statement.length < problem.statement.length
  };
}

export async function searchProblemSetsTool(input: SearchProblemSetsInput, fetchImpl?: typeof fetch): Promise<SearchProblemSetsResult> {
  const keyword = requireNonEmpty(input.keyword, "keyword");
  const page = normalizePage(input.page);
  const limit = normalizeLimit(input.limit, 8, 30);
  const results = await new LuoguClient({ fetchImpl }).searchProblemSets({ keyword, page });

  return {
    platform: "luogu",
    query: keyword,
    page,
    total: results.total,
    items: results.items.slice(0, limit)
  };
}

export async function fetchProblemSetTool(input: FetchProblemSetInput, fetchImpl?: typeof fetch): Promise<FetchProblemSetResult> {
  const id = requireNonEmpty(input.id, "id");
  const limit = normalizeLimit(input.limit, 100, 500);
  const problemSet = await new LuoguClient({ fetchImpl }).fetchProblemSet(id);
  const problems = problemSet.problems.slice(0, limit);

  return {
    ...problemSet,
    problems,
    truncatedProblemList: problems.length < problemSet.problems.length
  };
}

export function recommendProblemsTool(input: RecommendProblemsInput) {
  return recommendProblems(input);
}

function requireNonEmpty(value: string, name: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${name} is required.`);
  }
  return normalized;
}

function normalizePage(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.floor(value));
}

function normalizeLimit(value: number | undefined, fallback: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.min(Math.floor(value), max));
}

function trimText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  return text.slice(0, maxChars);
}
