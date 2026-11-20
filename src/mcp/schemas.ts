import { z } from "zod";

export const LUOGU_MCP_TOOL_NAMES = [
  "luogu_search_problems",
  "luogu_fetch_problem",
  "luogu_resolve_problem",
  "luogu_find_related_problems",
  "luogu_list_algorithm_topics",
  "luogu_find_topic_problems",
  "luogu_search_problem_sets",
  "luogu_fetch_problem_set",
  "luogu_recommend_problems",
  "luogu_get_user_profile",
  "luogu_get_capabilities",
] as const;

export type LuoguMcpToolName = (typeof LUOGU_MCP_TOOL_NAMES)[number];

export const LUOGU_TOOL_SCHEMAS = {
  luogu_search_problems: z.object({
    keyword: z
      .string()
      .min(1)
      .describe("Keyword, topic, title fragment, or problem id."),
    page: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Luogu list page, starting from 1."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(30)
      .optional()
      .describe("Maximum returned items."),
    tagIds: z
      .array(z.number().int().min(1))
      .max(20)
      .optional()
      .describe(
        "Optional Luogu tag ids to narrow topic search, such as [11] for tree-related searches."
      ),
  }),

  luogu_fetch_problem: z.object({
    pid: z.string().min(1).describe("Luogu problem id, such as P1305."),
    maxStatementChars: z
      .number()
      .int()
      .min(200)
      .max(30000)
      .optional()
      .describe("Trim long statements for model context control."),
  }),

  luogu_resolve_problem: z.object({
    query: z
      .string()
      .min(1)
      .describe("Luogu URL, pid such as P1305, or title/keyword fragment."),
    maxStatementChars: z
      .number()
      .int()
      .min(200)
      .max(30000)
      .optional()
      .describe("Trim long statements for model context control."),
  }),

  luogu_find_related_problems: z.object({
    query: z
      .string()
      .optional()
      .describe("Free-text query, title fragment, or topic phrase."),
    pid: z
      .string()
      .optional()
      .describe("Current Luogu problem id, used for context derivation and exclusion."),
    topic: z
      .string()
      .optional()
      .describe("Topic such as binary_tree, recursion, matrix, output_format, tree_distance."),
    painPoint: z
      .string()
      .optional()
      .describe("Student pain point such as traversal_order_confusion or sentinel_input."),
    currentProblemId: z
      .string()
      .optional()
      .describe("Exclude this current Luogu problem id."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe("Maximum returned related problems."),
  }),

  luogu_list_algorithm_topics: z.object({}),

  luogu_find_topic_problems: z.object({
    topic: z
      .string()
      .min(1)
      .describe("Algorithm topic or alias, such as SPFA, Prim, Treap, 二叉树, or 动态规划."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(30)
      .optional()
      .describe("Maximum returned items."),
    excludeProblemIds: z
      .array(z.string().min(1))
      .max(100)
      .optional()
      .describe("Luogu problem ids to exclude from recommendations."),
  }),

  luogu_search_problem_sets: z.object({
    keyword: z
      .string()
      .min(1)
      .describe("Training set keyword or title fragment."),
    page: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Luogu training list page, starting from 1."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(30)
      .optional()
      .describe("Maximum returned items."),
    type: z
      .enum(["all", "official", "select"])
      .optional()
      .describe(
        "Search scope: all combines official and selected sets; official filters Luogu official sets by title; select searches selected user-shared sets."
      ),
  }),

  luogu_fetch_problem_set: z.object({
    id: z.string().min(1).describe("Luogu training id, such as 100."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .describe("Maximum returned problem summaries."),
  }),

  luogu_recommend_problems: z.object({
    topic: z
      .string()
      .optional()
      .describe("Topic such as binary_tree, recursion, matrix, output_format, tree_distance."),
    painPoint: z
      .string()
      .optional()
      .describe("Student pain point such as traversal_order_confusion or sentinel_input."),
    currentProblemId: z
      .string()
      .optional()
      .describe("Exclude this current Luogu problem id."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe("Maximum returned recommendations."),
  }),

  luogu_get_user_profile: z.object({
    uid: z.number().int().min(1).describe("Luogu user id."),
  }),

  luogu_get_capabilities: z.object({}),
} as const;
