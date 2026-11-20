import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { describe, expect, test } from "vitest";
import { CachedLuoguGateway } from "../src/client/index.js";
import { LUOGU_MCP_TOOL_NAMES, createLuoguMcpServer } from "../src/server.js";
import { FakeLuoguGateway } from "./fixtures/luoguFixtures.js";

describe("Luogu MCP server", () => {
  test("exposes a compact searchable tool surface", () => {
    expect(LUOGU_MCP_TOOL_NAMES).toEqual([
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
    ]);
  });

  test("executes tools end-to-end over MCP v2 InMemoryTransport with caching and structured errors", async () => {
    const innerGateway = new FakeLuoguGateway({
      searchResults: {
        SPFA: [],
        最短路: [
          {
            platform: "luogu",
            id: "P4779",
            title: "【模板】单源最短路径（标准版）",
            sourceUrl: "https://www.luogu.com.cn/problem/P4779",
            difficulty: 3,
            tags: ["93"],
          },
        ],
      },
    });
    const cachedGateway = new CachedLuoguGateway(innerGateway);
    const server = createLuoguMcpServer({ gateway: cachedGateway });
    const client = new Client({ name: "luogu-server-integration-test", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const listed = await client.listTools();
      expect(listed.tools.map((tool) => tool.name)).toEqual([...LUOGU_MCP_TOOL_NAMES]);

      const firstFetch = await client.callTool({
        name: "luogu_fetch_problem",
        arguments: { pid: "p1305" },
      });
      const secondFetch = await client.callTool({
        name: "luogu_fetch_problem",
        arguments: { pid: "P1305" },
      });

      expect(firstFetch.isError).not.toBe(true);
      expect(firstFetch.structuredContent).toMatchObject({ id: "P1305", title: "新二叉树" });
      expect(secondFetch.structuredContent).toMatchObject({ id: "P1305", title: "新二叉树" });
      expect(innerGateway.calls.filter((call) => call.method === "fetchProblem")).toHaveLength(1);

      const topicRes = await client.callTool({
        name: "luogu_find_topic_problems",
        arguments: { topic: "SPFA", limit: 3 },
      });
      expect(topicRes.structuredContent).toMatchObject({
        topic: "SPFA",
        canonicalTopic: "SPFA",
        queriesTried: ["SPFA", "最短路"],
      });

      const missingRes = await client.callTool({
        name: "luogu_fetch_problem",
        arguments: { pid: "P999999" },
      });
      expect(missingRes.isError).toBe(true);
      const errorText = missingRes.content.find((item) => item.type === "text")?.text ?? "";
      expect(errorText).toContain("[NOT_FOUND]");
    } finally {
      await Promise.all([client.close(), server.close()]);
    }
  });
});
