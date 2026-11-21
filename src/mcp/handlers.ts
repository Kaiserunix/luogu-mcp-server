import {
  fetchAndTrimProblem,
  findRelatedProblemsWithGateway,
  findTopicProblemsWithGateway,
  listAlgorithmTopics,
  recommendProblems,
  resolveProblemWithGateway,
  searchProblemSetsWithGateway,
  type FetchProblemResult,
  type FindRelatedProblemsInput,
  type FindRelatedProblemsResult,
  type FindTopicProblemsInput,
  type FindTopicProblemsResult,
  type LuoguAlgorithmTopic,
  type RecommendProblemsInput,
  type RecommendProblemsResult,
  type ResolveProblemInput,
  type SearchProblemSetsInput,
  type SearchProblemSetsResult,
} from "../recommender/index.js";
import {
  normalizeLimit,
  normalizePage,
  normalizeProblemId,
  requireNonEmpty,
  requirePositiveInteger,
} from "../shared/validation.js";
import type { LuoguGateway, ProblemSetRecord, ProblemSummary, UserProfile } from "../types.js";
import { getLuoguRouteCapabilities, type LuoguRouteCapabilities } from "./capabilities.js";

export interface SearchProblemsInput {
  keyword: string;
  page?: number;
  limit?: number;
  tagIds?: number[];
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

export interface FetchProblemSetInput {
  id: string;
  limit?: number;
}

export interface FetchProblemSetResult extends ProblemSetRecord {
  truncatedProblemList: boolean;
}

export interface GetUserProfileInput {
  uid: number;
}

export interface ListAlgorithmTopicsResult {
  platform: "luogu";
  items: LuoguAlgorithmTopic[];
}

export interface LuoguToolHandlers {
  searchProblems(input: SearchProblemsInput): Promise<SearchProblemsResult>;
  fetchProblem(input: FetchProblemInput): Promise<FetchProblemResult>;
  resolveProblem(input: ResolveProblemInput): Promise<FetchProblemResult>;
  findRelatedProblems(input: FindRelatedProblemsInput): Promise<FindRelatedProblemsResult>;
  listAlgorithmTopics(): ListAlgorithmTopicsResult;
  findTopicProblems(input: FindTopicProblemsInput): Promise<FindTopicProblemsResult>;
  searchProblemSets(input: SearchProblemSetsInput): Promise<SearchProblemSetsResult>;
  fetchProblemSet(input: FetchProblemSetInput): Promise<FetchProblemSetResult>;
  recommendProblems(input: RecommendProblemsInput): RecommendProblemsResult;
  getUserProfile(input: GetUserProfileInput): Promise<UserProfile>;
  getCapabilities(): LuoguRouteCapabilities;
}

/**
 * Create pure MCP tool handlers bound to an injected LuoguGateway.
 * Contains no transport, caching, or McpServer wiring details.
 */
export function createLuoguToolHandlers(gateway: LuoguGateway): LuoguToolHandlers {
  return {
    async searchProblems(input: SearchProblemsInput): Promise<SearchProblemsResult> {
      const keyword = requireNonEmpty(input.keyword, "keyword");
      const page = normalizePage(input.page);
      const limit = normalizeLimit(input.limit, 8, 30);
      const results = await gateway.searchProblems({ keyword, page, tagIds: input.tagIds });

      return {
        platform: "luogu",
        query: keyword,
        page,
        total: results.total,
        items: results.items.slice(0, limit),
      };
    },

    async fetchProblem(input: FetchProblemInput): Promise<FetchProblemResult> {
      const pid = normalizeProblemId(requireNonEmpty(input.pid, "pid"));
      const maxStatementChars = normalizeLimit(input.maxStatementChars, 5000, 30000);
      return fetchAndTrimProblem(gateway, pid, maxStatementChars);
    },

    async resolveProblem(input: ResolveProblemInput): Promise<FetchProblemResult> {
      return resolveProblemWithGateway(gateway, input);
    },

    async findRelatedProblems(input: FindRelatedProblemsInput): Promise<FindRelatedProblemsResult> {
      return findRelatedProblemsWithGateway(gateway, input);
    },

    listAlgorithmTopics(): ListAlgorithmTopicsResult {
      return {
        platform: "luogu",
        items: listAlgorithmTopics(),
      };
    },

    async findTopicProblems(input: FindTopicProblemsInput): Promise<FindTopicProblemsResult> {
      return findTopicProblemsWithGateway(gateway, input);
    },

    async searchProblemSets(input: SearchProblemSetsInput): Promise<SearchProblemSetsResult> {
      return searchProblemSetsWithGateway(gateway, input);
    },

    async fetchProblemSet(input: FetchProblemSetInput): Promise<FetchProblemSetResult> {
      const id = requireNonEmpty(input.id, "id");
      const limit = normalizeLimit(input.limit, 100, 500);
      const problemSet = await gateway.fetchProblemSet(id);
      const problems = problemSet.problems.slice(0, limit);

      return {
        ...problemSet,
        problems,
        truncatedProblemList: problems.length < problemSet.problems.length,
      };
    },

    recommendProblems(input: RecommendProblemsInput): RecommendProblemsResult {
      return recommendProblems(input);
    },

    async getUserProfile(input: GetUserProfileInput): Promise<UserProfile> {
      const uid = requirePositiveInteger(input.uid, "uid");
      return gateway.fetchUserProfile(uid);
    },

    getCapabilities(): LuoguRouteCapabilities {
      return getLuoguRouteCapabilities();
    },
  };
}
