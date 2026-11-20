import {
  extractProblemId,
  normalizeLimit,
  normalizePage,
  requireNonEmpty,
  trimText,
} from "../shared/validation.js";
import type {
  LuoguGateway,
  ProblemRecord,
  ProblemSetSearchType,
  ProblemSetSummary,
  SearchResults,
} from "../types.js";

export interface ResolveProblemInput {
  query: string;
  maxStatementChars?: number;
}

export interface FetchProblemResult extends ProblemRecord {
  truncated: boolean;
}

export interface SearchProblemSetsInput {
  keyword: string;
  page?: number;
  limit?: number;
  type?: ProblemSetSearchType | "all";
}

export interface SearchProblemSetsResult {
  platform: "luogu";
  query: string;
  page: number;
  total: number;
  items: ProblemSetSummary[];
}

/** Resolve a Luogu problem URL, problem id, or title fragment, then fetch its full details. */
export async function resolveProblemWithGateway(
  gateway: LuoguGateway,
  input: ResolveProblemInput
): Promise<FetchProblemResult> {
  const query = requireNonEmpty(input.query, "query");
  const maxStatementChars = normalizeLimit(input.maxStatementChars, 5000, 30000);
  const directPid = extractProblemId(query);

  if (directPid) {
    return fetchAndTrimProblem(gateway, directPid, maxStatementChars);
  }

  const search = await gateway.searchProblems({ keyword: query, page: 1 });
  const first = search.items[0];
  if (!first) {
    throw new Error(`No Luogu problem matched query: ${query}`);
  }

  return fetchAndTrimProblem(gateway, first.id, maxStatementChars);
}

/** Fetch one problem and trim its statement for MCP context control. */
export async function fetchAndTrimProblem(
  gateway: LuoguGateway,
  pid: string,
  maxStatementChars: number
): Promise<FetchProblemResult> {
  const problem = await gateway.fetchProblem(pid);
  const statement = trimText(problem.statement, maxStatementChars);
  return {
    ...problem,
    statement,
    truncated: statement.length < problem.statement.length,
  };
}

/**
 * Search Luogu training sets by keyword.
 * Queries official and selected sets concurrently when type is "all", filters by normalized title,
 * and deduplicates preserving official-first order.
 */
export async function searchProblemSetsWithGateway(
  gateway: LuoguGateway,
  input: SearchProblemSetsInput
): Promise<SearchProblemSetsResult> {
  const keyword = requireNonEmpty(input.keyword, "keyword");
  const page = normalizePage(input.page);
  const limit = normalizeLimit(input.limit, 8, 30);
  const type = normalizeProblemSetSearchType(input.type);

  let results: SearchResults<ProblemSetSummary>;
  if (type === "all") {
    const [official, selected] = await Promise.all([
      gateway.searchProblemSets({ keyword, page, type: "official" }),
      gateway.searchProblemSets({ keyword, page, type: "select" }),
    ]);
    results = combineProblemSetSearches(keyword, [official, selected]);
  } else {
    results = filterProblemSetSearchResults(
      keyword,
      await gateway.searchProblemSets({ keyword, page, type })
    );
  }

  return {
    platform: "luogu",
    query: keyword,
    page,
    total: results.total,
    items: results.items.slice(0, limit),
  };
}

function normalizeProblemSetSearchType(value: SearchProblemSetsInput["type"]): ProblemSetSearchType | "all" {
  if (value === "official" || value === "select") {
    return value;
  }
  return "all";
}

function combineProblemSetSearches(
  keyword: string,
  searches: SearchResults<ProblemSetSummary>[]
): SearchResults<ProblemSetSummary> {
  const seen = new Set<string>();
  const items: ProblemSetSummary[] = [];

  for (const search of searches) {
    for (const item of filterProblemSetSearchResults(keyword, search).items) {
      if (seen.has(item.id)) {
        continue;
      }
      seen.add(item.id);
      items.push(item);
    }
  }

  return {
    total: items.length,
    items,
  };
}

function filterProblemSetSearchResults(
  keyword: string,
  search: SearchResults<ProblemSetSummary>
): SearchResults<ProblemSetSummary> {
  const normalizedKeyword = normalizeSearchText(keyword);
  const items = search.items.filter((item) => normalizeSearchText(item.title).includes(normalizedKeyword));
  return {
    total: items.length,
    items,
  };
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}
