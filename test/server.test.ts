import { describe, expect, test } from "vitest";
import { LUOGU_MCP_TOOL_NAMES } from "../src/server.js";

describe("Luogu MCP server", () => {
  test("exposes a compact searchable tool surface", () => {
    expect(LUOGU_MCP_TOOL_NAMES).toEqual([
      "luogu_search_problems",
      "luogu_fetch_problem",
      "luogu_resolve_problem",
      "luogu_find_related_problems",
      "luogu_search_problem_sets",
      "luogu_fetch_problem_set",
      "luogu_recommend_problems",
      "luogu_get_user_profile",
      "luogu_get_capabilities"
    ]);
  });
});
