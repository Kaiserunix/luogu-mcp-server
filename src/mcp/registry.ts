import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { LuoguClientError } from "../client/errors.js";
import type { LuoguToolHandlers } from "./handlers.js";
import { LUOGU_TOOL_SCHEMAS } from "./schemas.js";

/** Register all Luogu MCP v2 tools onto an McpServer instance using decoupled handlers and schemas. */
export function registerLuoguTools(server: McpServer, handlers: LuoguToolHandlers): void {
  server.registerTool(
    "luogu_search_problems",
    {
      title: "Search Luogu Problems",
      description:
        "Search Luogu problems by keyword. Use this before fetching a problem when you only know a topic or partial title.",
      inputSchema: LUOGU_TOOL_SCHEMAS.luogu_search_problems,
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async (input) => executeTool(() => handlers.searchProblems(input))
  );

  server.registerTool(
    "luogu_fetch_problem",
    {
      title: "Fetch Luogu Problem",
      description:
        "Fetch a Luogu problem statement, formats, samples, tags, difficulty, and source URL by pid.",
      inputSchema: LUOGU_TOOL_SCHEMAS.luogu_fetch_problem,
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async (input) => executeTool(() => handlers.fetchProblem(input))
  );

  server.registerTool(
    "luogu_resolve_problem",
    {
      title: "Resolve Luogu Problem",
      description:
        "Resolve a Luogu problem from a URL, problem id, or title fragment, then fetch the problem details.",
      inputSchema: LUOGU_TOOL_SCHEMAS.luogu_resolve_problem,
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async (input) => executeTool(() => handlers.resolveProblem(input))
  );

  server.registerTool(
    "luogu_find_related_problems",
    {
      title: "Find Related Luogu Problems",
      description:
        "Find related Luogu practice problems by mixing topic/pain-point recommendations with live keyword search.",
      inputSchema: LUOGU_TOOL_SCHEMAS.luogu_find_related_problems,
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async (input) => executeTool(() => handlers.findRelatedProblems(input))
  );

  server.registerTool(
    "luogu_list_algorithm_topics",
    {
      title: "List Luogu Algorithm Topics",
      description:
        "List canonical algorithm topics, aliases, and known Luogu tag ids used by the high-level topic search route.",
      inputSchema: LUOGU_TOOL_SCHEMAS.luogu_list_algorithm_topics,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async () => executeTool(() => handlers.listAlgorithmTopics())
  );

  server.registerTool(
    "luogu_find_topic_problems",
    {
      title: "Find Luogu Topic Problems",
      description:
        "Find Luogu practice problems for an algorithm topic using aliases, known Luogu tag ids, deduplication, and match reasons.",
      inputSchema: LUOGU_TOOL_SCHEMAS.luogu_find_topic_problems,
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async (input) => executeTool(() => handlers.findTopicProblems(input))
  );

  server.registerTool(
    "luogu_search_problem_sets",
    {
      title: "Search Luogu Training Sets",
      description:
        "Search Luogu training/problem sets by keyword. By default, combines title-filtered official sets with selected user-shared sets.",
      inputSchema: LUOGU_TOOL_SCHEMAS.luogu_search_problem_sets,
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async (input) => executeTool(() => handlers.searchProblemSets(input))
  );

  server.registerTool(
    "luogu_fetch_problem_set",
    {
      title: "Fetch Luogu Training Set",
      description:
        "Fetch a Luogu training/problem set and its problem summaries by id.",
      inputSchema: LUOGU_TOOL_SCHEMAS.luogu_fetch_problem_set,
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async (input) => executeTool(() => handlers.fetchProblemSet(input))
  );

  server.registerTool(
    "luogu_recommend_problems",
    {
      title: "Recommend Luogu Problems",
      description:
        "Recommend seed Luogu problems from a topic or student pain point, with search hints for further exploration.",
      inputSchema: LUOGU_TOOL_SCHEMAS.luogu_recommend_problems,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async (input) => executeTool(() => handlers.recommendProblems(input))
  );

  server.registerTool(
    "luogu_get_user_profile",
    {
      title: "Get Luogu User Profile",
      description: "Fetch public Luogu user profile data by uid.",
      inputSchema: LUOGU_TOOL_SCHEMAS.luogu_get_user_profile,
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async (input) => executeTool(() => handlers.getUserProfile(input))
  );

  server.registerTool(
    "luogu_get_capabilities",
    {
      title: "Get Luogu Route Capabilities",
      description:
        "Report which LeetCode-style route capabilities are available, auth-required, or planned for Luogu.",
      inputSchema: LUOGU_TOOL_SCHEMAS.luogu_get_capabilities,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async () => executeTool(() => handlers.getCapabilities())
  );
}

async function executeTool<T>(run: () => Promise<T> | T): Promise<CallToolResult> {
  try {
    return toToolResult(await run());
  } catch (error) {
    return toToolErrorResult(error);
  }
}

export function toToolResult(result: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
    structuredContent: result as Record<string, unknown>,
  };
}

export function toToolErrorResult(error: unknown): CallToolResult {
  const message =
    error instanceof LuoguClientError
      ? `[${error.code}] ${error.message}`
      : error instanceof Error
        ? error.message
        : String(error);

  return {
    content: [
      {
        type: "text",
        text: message,
      },
    ],
    isError: true,
  };
}
