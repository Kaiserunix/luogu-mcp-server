import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  fetchProblemSetTool,
  fetchProblemTool,
  recommendProblemsTool,
  searchProblemSetsTool,
  searchProblemsTool
} from "./tools.js";

export const LUOGU_MCP_TOOL_NAMES = [
  "luogu_search_problems",
  "luogu_fetch_problem",
  "luogu_search_problem_sets",
  "luogu_fetch_problem_set",
  "luogu_recommend_problems"
] as const;

export function createLuoguMcpServer(): McpServer {
  const server = new McpServer({
    name: "luogu-mcp-server",
    version: "0.1.0"
  });

  server.registerTool(
    "luogu_search_problems",
    {
      title: "Search Luogu Problems",
      description: "Search Luogu problems by keyword. Use this before fetching a problem when you only know a topic or partial title.",
      inputSchema: {
        keyword: z.string().min(1).describe("Keyword, topic, title fragment, or problem id."),
        page: z.number().int().min(1).optional().describe("Luogu list page, starting from 1."),
        limit: z.number().int().min(1).max(30).optional().describe("Maximum returned items.")
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
