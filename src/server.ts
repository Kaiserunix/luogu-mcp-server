import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  findRelatedProblemsTool,
  findTopicProblemsTool,
  fetchProblemSetTool,
  fetchProblemTool,
  getCapabilitiesTool,
  getUserProfileTool,
  listAlgorithmTopicsTool,
  recommendProblemsTool,
  resolveProblemTool,
  searchProblemSetsTool,
  searchProblemsTool
} from "./tools.js";

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
  "luogu_get_capabilities"
] as const;

export function createLuoguMcpServer(): McpServer {
  const server = new McpServer({
    name: "luogu-mcp-server",
    version: "0.2.0"
  });

  server.registerTool(
    "luogu_search_problems",
    {
      title: "Search Luogu Problems",
      description: "Search Luogu problems by keyword. Use this before fetching a problem when you only know a topic or partial title.",
      inputSchema: {
        keyword: z.string().min(1).describe("Keyword, topic, title fragment, or problem id."),
        page: z.number().int().min(1).optional().describe("Luogu list page, starting from 1."),
        limit: z.number().int().min(1).max(30).optional().describe("Maximum returned items."),
        tagIds: z.array(z.number().int().min(1)).max(20).optional().describe("Optional Luogu tag ids to narrow topic search, such as [11] for tree-related searches.")
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true
      }
    },
    async (input) => toToolResult(await searchProblemsTool(input))
  );

  server.registerTool(
    "luogu_fetch_problem",
    {
      title: "Fetch Luogu Problem",
      description: "Fetch a Luogu problem statement, formats, samples, tags, difficulty, and source URL by pid.",
      inputSchema: {
        pid: z.string().min(1).describe("Luogu problem id, such as P1305."),
        maxStatementChars: z.number().int().min(200).max(30000).optional().describe("Trim long statements for model context control.")
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true
      }
    },
    async (input) => toToolResult(await fetchProblemTool(input))
  );

  server.registerTool(
    "luogu_resolve_problem",
    {
      title: "Resolve Luogu Problem",
      description: "Resolve a Luogu problem from a URL, problem id, or title fragment, then fetch the problem details.",
      inputSchema: {
        query: z.string().min(1).describe("Luogu URL, pid such as P1305, or title/keyword fragment."),
        maxStatementChars: z.number().int().min(200).max(30000).optional().describe("Trim long statements for model context control.")
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true
      }
    },
    async (input) => toToolResult(await resolveProblemTool(input))
  );

  server.registerTool(
    "luogu_find_related_problems",
    {
      title: "Find Related Luogu Problems",
      description: "Find related Luogu practice problems by mixing topic/pain-point recommendations with live keyword search.",
      inputSchema: {
        query: z.string().optional().describe("Free-text query, title fragment, or topic phrase."),
        pid: z.string().optional().describe("Current Luogu problem id, used for context and exclusion in future versions."),
        topic: z.string().optional().describe("Topic such as binary_tree, recursion, matrix, output_format, tree_distance."),
        painPoint: z.string().optional().describe("Student pain point such as traversal_order_confusion or sentinel_input."),
        currentProblemId: z.string().optional().describe("Exclude this current Luogu problem id."),
        limit: z.number().int().min(1).max(20).optional().describe("Maximum returned related problems.")
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true
      }
    },
    async (input) => toToolResult(await findRelatedProblemsTool(input))
  );

  server.registerTool(
    "luogu_list_algorithm_topics",
    {
      title: "List Luogu Algorithm Topics",
      description: "List canonical algorithm topics, aliases, and known Luogu tag ids used by the high-level topic search route.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        openWorldHint: false
      }
    },
    async () => toToolResult(listAlgorithmTopicsTool())
  );

  server.registerTool(
    "luogu_find_topic_problems",
    {
      title: "Find Luogu Topic Problems",
      description: "Find Luogu practice problems for an algorithm topic using aliases, known Luogu tag ids, deduplication, and match reasons.",
      inputSchema: {
        topic: z.string().min(1).describe("Algorithm topic or alias, such as SPFA, Prim, Treap, 二叉树, or 动态规划."),
        limit: z.number().int().min(1).max(30).optional().describe("Maximum returned items."),
        excludeProblemIds: z.array(z.string().min(1)).max(100).optional().describe("Luogu problem ids to exclude from recommendations.")
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true
      }
    },
    async (input) => toToolResult(await findTopicProblemsTool(input))
  );

  server.registerTool(
    "luogu_search_problem_sets",
    {
      title: "Search Luogu Training Sets",
      description: "Search Luogu training/problem sets by keyword.",
      inputSchema: {
        keyword: z.string().min(1).describe("Training set keyword or title fragment."),
        page: z.number().int().min(1).optional().describe("Luogu training list page, starting from 1."),
        limit: z.number().int().min(1).max(30).optional().describe("Maximum returned items.")
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true
      }
    },
    async (input) => toToolResult(await searchProblemSetsTool(input))
  );

  server.registerTool(
    "luogu_fetch_problem_set",
    {
      title: "Fetch Luogu Training Set",
      description: "Fetch a Luogu training/problem set and its problem summaries by id.",
      inputSchema: {
        id: z.string().min(1).describe("Luogu training id, such as 100."),
        limit: z.number().int().min(1).max(500).optional().describe("Maximum returned problem summaries.")
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true
      }
    },
    async (input) => toToolResult(await fetchProblemSetTool(input))
  );

  server.registerTool(
    "luogu_recommend_problems",
    {
      title: "Recommend Luogu Problems",
      description: "Recommend seed Luogu problems from a topic or student pain point, with search hints for further exploration.",
      inputSchema: {
        topic: z.string().optional().describe("Topic such as binary_tree, recursion, matrix, output_format, tree_distance."),
        painPoint: z.string().optional().describe("Student pain point such as traversal_order_confusion or sentinel_input."),
        currentProblemId: z.string().optional().describe("Exclude this current Luogu problem id."),
        limit: z.number().int().min(1).max(10).optional().describe("Maximum returned recommendations.")
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false
      }
    },
    async (input) => toToolResult(recommendProblemsTool(input))
  );

  server.registerTool(
    "luogu_get_user_profile",
    {
      title: "Get Luogu User Profile",
      description: "Fetch public Luogu user profile data by uid.",
      inputSchema: {
        uid: z.number().int().min(1).describe("Luogu user id.")
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true
      }
    },
    async (input) => toToolResult(await getUserProfileTool(input))
  );

  server.registerTool(
    "luogu_get_capabilities",
    {
      title: "Get Luogu Route Capabilities",
      description: "Report which LeetCode-style route capabilities are available, auth-required, or planned for Luogu.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        openWorldHint: false
      }
    },
    async () => toToolResult(getCapabilitiesTool())
  );

  return server;
}

function toToolResult(result: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2)
      }
    ],
    structuredContent: result as Record<string, unknown>
  };
}
