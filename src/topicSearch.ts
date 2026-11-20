import { LuoguClient } from "./client/luoguClient.js";
import {
  findTopicProblemsWithGateway,
  rankTopicProblems,
  scoreTopicProblem,
  type FindTopicProblemsInput,
  type FindTopicProblemsResult,
} from "./recommender/topicSearch.js";
import type { LuoguGateway } from "./types.js";

export {
  findTopicProblemsWithGateway,
  rankTopicProblems,
  scoreTopicProblem,
  type FindTopicProblemsInput,
  type FindTopicProblemsResult,
};

/**
 * Compatibility wrapper allowing callers/tests to pass a fetch implementation or LuoguGateway.
 */
export async function findTopicProblems(
  input: FindTopicProblemsInput,
  fetchOrGateway?: typeof fetch | LuoguGateway
): Promise<FindTopicProblemsResult> {
  const gateway = isLuoguGateway(fetchOrGateway)
    ? fetchOrGateway
    : new LuoguClient({ fetchImpl: fetchOrGateway });
  return findTopicProblemsWithGateway(gateway, input);
}

function isLuoguGateway(candidate: unknown): candidate is LuoguGateway {
  return Boolean(
    candidate &&
      typeof candidate === "object" &&
      typeof (candidate as LuoguGateway).searchProblems === "function"
  );
}
