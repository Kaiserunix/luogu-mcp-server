import { describe, expect, test } from "vitest";
import {
  fetchProblemTool,
  fetchProblemSetTool,
  findRelatedProblemsTool,
  getCapabilitiesTool,
  getUserProfileTool,
  recommendProblemsTool,
  resolveProblemTool,
  searchProblemSetsTool,
  searchProblemsTool
} from "../src/tools.js";

describe("Luogu MCP tool handlers", () => {
  test("searches problems with page and limit", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fakeFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      calls.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          data: {
            problems: {
              count: 2,
              result: [
                { pid: "P1305", title: "新二叉树", difficulty: 2, tags: [72] },
                { pid: "P4913", title: "二叉树深度", difficulty: 1, tags: [72] }
              ]
            }
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    };

    const result = await searchProblemsTool({ keyword: "二叉树", page: 2, limit: 1 }, fakeFetch as typeof fetch);

    expect(calls[0].url).toContain("page=2");
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("P1305");
  });

  test("searches problems with Luogu tag filters", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fakeFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      calls.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          data: {
            problems: {
              count: 1,
              result: [{ pid: "P4913", title: "二叉树深度", difficulty: 1, tags: [11] }]
            }
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    };

    const result = await searchProblemsTool({ keyword: "二叉树", tagIds: [11], limit: 5 }, fakeFetch as typeof fetch);
    const url = new URL(calls[0].url);

    expect(url.searchParams.get("keyword")).toBe("二叉树");
    expect(url.searchParams.getAll("tag")).toEqual(["11"]);
    expect(result.items[0].tags).toEqual(["11"]);
  });

  test("fetches and trims a problem statement", async () => {
    const fakeFetch = async (): Promise<Response> =>
      new Response(
        JSON.stringify({
          data: {
            problem: {
              pid: "P1305",
              title: "新二叉树",
              description: "x".repeat(500),
              inputFormat: "input",
              outputFormat: "output",
              samples: [["in", "out"]]
            }
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );

    const result = await fetchProblemTool({ pid: "p1305", maxStatementChars: 80 }, fakeFetch as typeof fetch);

    expect(result.id).toBe("P1305");
    expect(result.statement).toHaveLength(80);
    expect(result.truncated).toBe(true);
  });

  test("searches and fetches training sets", async () => {
    const fakeFetch = async (url: string | URL | Request): Promise<Response> => {
      const href = String(url);
      if (href.includes("/training/list")) {
        return new Response(
          JSON.stringify({ currentData: { trainings: { count: 1, result: [{ id: 100, title: "入门", problemCount: 2 }] } } }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          currentData: {
            training: {
              id: 100,
              title: "入门",
              problemCount: 1,
              problems: [{ problem: { pid: "P1001", title: "A+B Problem" } }]
            }
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    };

    expect((await searchProblemSetsTool({ keyword: "入门" }, fakeFetch as typeof fetch)).items[0].id).toBe("100");
    expect((await fetchProblemSetTool({ id: "100", limit: 1 }, fakeFetch as typeof fetch)).problems[0].id).toBe("P1001");
  });

  test("recommends from topic and pain point hints", () => {
    const result = recommendProblemsTool({
      topic: "binary_tree",
      painPoint: "traversal_order_confusion",
      limit: 3
    });

    expect(result.items.map((item) => item.id)).toEqual(["P1305", "P1030", "P1827"]);
    expect(result.searchHints).toContain("二叉树 遍历");
  });

  test("resolves problem ids and urls before falling back to keyword search", async () => {
    const calls: string[] = [];
    const fakeFetch = async (url: string | URL | Request): Promise<Response> => {
      calls.push(String(url));
      return new Response(
        JSON.stringify({
          data: {
            problem: {
              pid: "P1305",
              title: "新二叉树",
              description: "tree",
              inputFormat: "input",
              outputFormat: "output",
              samples: []
            }
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    };

    const byId = await resolveProblemTool({ query: "p1305" }, fakeFetch as typeof fetch);
    const byUrl = await resolveProblemTool({ query: "https://www.luogu.com.cn/problem/P1305" }, fakeFetch as typeof fetch);

    expect(byId.id).toBe("P1305");
    expect(byUrl.id).toBe("P1305");
    expect(calls.every((url) => url.includes("/problem/P1305"))).toBe(true);
  });

  test("finds related problems by mixing recommendations and Luogu search", async () => {
    const fakeFetch = async (): Promise<Response> =>
      new Response(
        JSON.stringify({
          data: {
            problems: {
              count: 1,
              result: [{ pid: "B3642", title: "二叉树的遍历", difficulty: 2, tags: [72] }]
            }
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );

    const result = await findRelatedProblemsTool(
      { topic: "binary_tree", painPoint: "traversal_order_confusion", query: "二叉树 遍历", limit: 5 },
      fakeFetch as typeof fetch
    );

    expect(result.items.map((item) => item.id)).toEqual(["P1305", "P1030", "P1827", "P1229", "B3642"]);
    expect(result.searchHints).toContain("二叉树 遍历");
  });

  test("fetches public user profiles and reports route capabilities", async () => {
    const fakeFetch = async (): Promise<Response> =>
      new Response(
        JSON.stringify({
          data: {
            user: {
              uid: 1,
              name: "kkksc03",
              followingCount: 137,
              followerCount: 49761,
              ranking: 3916
            },
            gu: { rating: 217 }
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );

    const profile = await getUserProfileTool({ uid: 1 }, fakeFetch as typeof fetch);
    const capabilities = getCapabilitiesTool();

    expect(profile.name).toBe("kkksc03");
    expect(capabilities.tools.find((tool) => tool.name === "luogu_get_user_profile")?.status).toBe("available");
    expect(capabilities.tools.find((tool) => tool.name === "luogu_get_recent_submissions")?.status).toBe("auth_required");
  });
});
