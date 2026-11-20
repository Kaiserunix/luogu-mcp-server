import { LuoguClient } from "./client/luoguClient.js";
import {
  createLuoguToolHandlers,
  getLuoguRouteCapabilities,
  type FetchProblemInput,
  type FetchProblemSetInput,
  type FetchProblemSetResult,
  type GetUserProfileInput,
  type ListAlgorithmTopicsResult,
  type LuoguRouteCapabilities,
  type LuoguRouteCapability,
  type LuoguToolHandlers,
  type SearchProblemsInput,
  type SearchProblemsResult,
} from "./mcp/index.js";
import {
  listAlgorithmTopics,
  recommendProblems,
  type FetchProblemResult,
  type FindRelatedProblemsInput,
  type FindRelatedProblemsResult,
  type FindTopicProblemsInput,
  type FindTopicProblemsResult,
  type RecommendProblemsInput,
  type ResolveProblemInput,
  type SearchProblemSetsInput,
  type SearchProblemSetsResult,
} from "./recommender/index.js";
import type { LuoguGateway, UserProfile } from "./types.js";

export {
  createLuoguToolHandlers,
  type FetchProblemInput,
  type FetchProblemResult,
  type FetchProblemSetInput,
  type FetchProblemSetResult,
  type FindRelatedProblemsInput,
  type FindRelatedProblemsResult,
  type FindTopicProblemsInput,
  type FindTopicProblemsResult,
  type GetUserProfileInput,
  type ListAlgorithmTopicsResult,
  type LuoguRouteCapabilities,
  type LuoguRouteCapability,
  type LuoguToolHandlers,
  type ResolveProblemInput,
  type SearchProblemSetsInput,
  type SearchProblemSetsResult,
  type SearchProblemsInput,
  type SearchProblemsResult,
};

function resolveHandlers(fetchOrGateway?: typeof fetch | LuoguGateway): LuoguToolHandlers {
  const gateway =
    fetchOrGateway && typeof fetchOrGateway === "object" && typeof fetchOrGateway.searchProblems === "function"
      ? fetchOrGateway
      : new LuoguClient({ fetchImpl: fetchOrGateway as typeof fetch | undefined });
  return createLuoguToolHandlers(gateway);
}

export async function searchProblemsTool(
  input: SearchProblemsInput,
  fetchOrGateway?: typeof fetch | LuoguGateway
): Promise<SearchProblemsResult> {
  return resolveHandlers(fetchOrGateway).searchProblems(input);
}

export async function fetchProblemTool(
  input: FetchProblemInput,
  fetchOrGateway?: typeof fetch | LuoguGateway
): Promise<FetchProblemResult> {
  return resolveHandlers(fetchOrGateway).fetchProblem(input);
}

export async function resolveProblemTool(
  input: ResolveProblemInput,
  fetchOrGateway?: typeof fetch | LuoguGateway
): Promise<FetchProblemResult> {
  return resolveHandlers(fetchOrGateway).resolveProblem(input);
}

export async function searchProblemSetsTool(
  input: SearchProblemSetsInput,
  fetchOrGateway?: typeof fetch | LuoguGateway
): Promise<SearchProblemSetsResult> {
  return resolveHandlers(fetchOrGateway).searchProblemSets(input);
}

export async function fetchProblemSetTool(
  input: FetchProblemSetInput,
  fetchOrGateway?: typeof fetch | LuoguGateway
): Promise<FetchProblemSetResult> {
  return resolveHandlers(fetchOrGateway).fetchProblemSet(input);
}

export function recommendProblemsTool(input: RecommendProblemsInput) {
  return recommendProblems(input);
}

export async function findTopicProblemsTool(
  input: FindTopicProblemsInput,
  fetchOrGateway?: typeof fetch | LuoguGateway
): Promise<FindTopicProblemsResult> {
  return resolveHandlers(fetchOrGateway).findTopicProblems(input);
}

export function listAlgorithmTopicsTool(): ListAlgorithmTopicsResult {
  return {
    platform: "luogu",
    items: listAlgorithmTopics(),
  };
}

export async function findRelatedProblemsTool(
  input: FindRelatedProblemsInput,
  fetchOrGateway?: typeof fetch | LuoguGateway
): Promise<FindRelatedProblemsResult> {
  return resolveHandlers(fetchOrGateway).findRelatedProblems(input);
}

export async function getUserProfileTool(
  input: GetUserProfileInput,
  fetchOrGateway?: typeof fetch | LuoguGateway
): Promise<UserProfile> {
  return resolveHandlers(fetchOrGateway).getUserProfile(input);
}

export function getCapabilitiesTool(): LuoguRouteCapabilities {
  return getLuoguRouteCapabilities();
}
