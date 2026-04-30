import { LuoguClient } from "./luoguClient.js";
import { recommendProblems, type RecommendProblemsInput } from "./recommendations.js";
import type { ProblemRecord, ProblemSetRecord, ProblemSetSummary, ProblemSummary, UserProfile } from "./types.js";

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

export interface ResolveProblemInput {
  query: string;
  maxStatementChars?: number;
}

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

export interface GetUserProfileInput {
  uid: number;
}

export interface LuoguRouteCapability {
  name: string;
  status: "available" | "auth_required" | "planned";
  note: string;
}

export interface LuoguRouteCapabilities {
  route: "luogu";
  tools: LuoguRouteCapability[];
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

export async function resolveProblemTool(input: ResolveProblemInput, fetchImpl?: typeof fetch): Promise<FetchProblemResult> {
  const query = requireNonEmpty(input.query, "query");
  const pid = extractProblemId(query);
  if (pid) {
    return fetchProblemTool({ pid, maxStatementChars: input.maxStatementChars }, fetchImpl);
  }

  const search = await searchProblemsTool({ keyword: query, limit: 1 }, fetchImpl);
  const first = search.items[0];
  if (!first) {
    throw new Error(`No Luogu problem matched query: ${query}`);
  }

  return fetchProblemTool({ pid: first.id, maxStatementChars: input.maxStatementChars }, fetchImpl);
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

export async function findRelatedProblemsTool(input: FindRelatedProblemsInput, fetchImpl?: typeof fetch): Promise<FindRelatedProblemsResult> {
  const limit = normalizeLimit(input.limit, 5, 20);
  const recommendations = recommendProblems({ ...input, limit });
  const items = [...recommendations.items];
  const hints = [...recommendations.searchHints];
  const searchQuery = input.query ?? hints[0] ?? input.pid;

  if (items.length < limit && searchQuery) {
    const search = await searchProblemsTool({ keyword: searchQuery, limit }, fetchImpl);
    for (const item of search.items) {
      if (!items.some((existing) => existing.id === item.id)) {
        items.push(item);
      }
      if (items.length >= limit) {
        break;
      }
    }
  }

  return {
    query: input.query,
    pid: input.pid,
    topic: input.topic,
    painPoint: input.painPoint,
    searchHints: hints,
    items
  };
}

export async function getUserProfileTool(input: GetUserProfileInput, fetchImpl?: typeof fetch): Promise<UserProfile> {
  const uid = normalizePage(input.uid);
  return new LuoguClient({ fetchImpl }).fetchUserProfile(uid);
}

export function getCapabilitiesTool(): LuoguRouteCapabilities {
  return {
    route: "luogu",
    tools: [
      {
        name: "luogu_search_problems",
        status: "available",
        note: "Public content-only problem list endpoint."
      },
      {
        name: "luogu_fetch_problem",
        status: "available",
        note: "Public content-only problem page endpoint."
      },
      {
        name: "luogu_search_problem_sets",
        status: "available",
        note: "Public training list endpoint."
      },
      {
        name: "luogu_fetch_problem_set",
        status: "available",
        note: "Public training page endpoint."
      },
      {
        name: "luogu_get_user_profile",
        status: "available",
        note: "Public user profile page endpoint; some practice counters can be null."
      },
      {
        name: "luogu_get_recent_submissions",
        status: "auth_required",
        note: "Record list currently redirects to login without Luogu session cookies."
      },
      {
        name: "luogu_search_solutions",
        status: "auth_required",
        note: "Problem solution pages currently require login in live probes."
      },
      {
        name: "luogu_search_discussions",
        status: "auth_required",
        note: "Discussion pages currently require login in live probes."
      },
      {
        name: "luogu_submit_solution",
        status: "planned",
        note: "Not implemented; would require authenticated session handling and explicit write-tool safety gates."
      }
    ]
  };
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

function extractProblemId(query: string): string | undefined {
  const match = query.match(/\bP\d+\b/i) ?? query.match(/luogu\.com\.cn\/problem\/(P\d+)/i);
  return match?.[1]?.toUpperCase() ?? match?.[0]?.toUpperCase();
}
