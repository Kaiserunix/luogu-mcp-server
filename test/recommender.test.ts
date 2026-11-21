import { describe, expect, test } from "vitest";
import {
  findRelatedProblemsWithGateway,
  findTopicProblemsWithGateway,
  rankTopicProblems,
  recommendProblems,
  resolveProblemWithGateway,
  searchProblemSetsWithGateway,
} from "../src/recommender/index.js";
import type { ProblemSummary } from "../src/types.js";
import { FakeLuoguGateway } from "./fixtures/luoguFixtures.js";

describe("Decoupled recommender domain logic", () => {
  test("findRelatedProblemsWithGateway excludes both currentProblemId and pid across all stages", async () => {
    const gateway = new FakeLuoguGateway({
      searchResults: {
        "二叉树 遍历": [
          { platform: "luogu", id: "P1305", title: "新二叉树", sourceUrl: "https://www.luogu.com.cn/problem/P1305", tags: ["11"] },
          { platform: "luogu", id: "B3642", title: "二叉树的遍历", sourceUrl: "https://www.luogu.com.cn/problem/B3642", tags: ["11"] },
        ],
      },
    });

    const result = await findRelatedProblemsWithGateway(gateway, {
      pid: "p1305",
      topic: "binary_tree",
      query: "二叉树 遍历",
      limit: 5,
    });

    const ids = result.items.map((item) => item.id);
    expect(ids).not.toContain("P1305");
    expect(ids).toEqual(["P1030", "P1827", "P1229", "B3642"]);
  });

  test("findRelatedProblemsWithGateway derives search query when only pid is given", async () => {
    const gateway = new FakeLuoguGateway({
      searchResults: {
        普通平衡树: [
          { platform: "luogu", id: "P3369", title: "【模板】普通平衡树", sourceUrl: "https://www.luogu.com.cn/problem/P3369", tags: ["42"] },
          { platform: "luogu", id: "P3391", title: "【模板】文艺平衡树", sourceUrl: "https://www.luogu.com.cn/problem/P3391", tags: ["42"] },
        ],
      },
    });

    const result = await findRelatedProblemsWithGateway(gateway, {
      pid: "P3369",
      limit: 3,
    });

    expect(result.searchHints).toContain("普通平衡树");
    expect(result.items.map((item) => item.id)).toEqual(["P3391"]);
  });

  test("resolveProblemWithGateway resolves B/CF/AT ids directly and falls back for /problem/list URLs", async () => {
    const gateway = new FakeLuoguGateway({
      searchResults: {
        "https://www.luogu.com.cn/problem/list?keyword=tree": [
          { platform: "luogu", id: "P1305", title: "新二叉树", sourceUrl: "https://www.luogu.com.cn/problem/P1305", tags: [] },
        ],
      },
    });

    const byB = await resolveProblemWithGateway(gateway, { query: "b2002" });
    expect(byB.id).toBe("B2002");

    const byUrl = await resolveProblemWithGateway(gateway, {
      query: "https://www.luogu.com.cn/problem/list?keyword=tree",
    });
    expect(byUrl.id).toBe("P1305");
    expect(gateway.calls.some((call) => call.method === "searchProblems")).toBe(true);

    await expect(resolveProblemWithGateway(gateway, { query: "nonexistent topic xyz" })).rejects.toThrow(
      "No Luogu problem matched query"
    );
  });

  test("findTopicProblemsWithGateway survives partial query failure when another alias succeeds", async () => {
    const gateway = new FakeLuoguGateway({
      onSearchProblems: async ({ keyword }) => {
        if (keyword === "SPFA") {
          throw new Error("Transient SPFA lookup failure");
        }
        return {
          total: 1,
          items: [
            {
              platform: "luogu",
              id: "P4779",
              title: "【模板】单源最短路径（标准版）",
              sourceUrl: "https://www.luogu.com.cn/problem/P4779",
              difficulty: 3,
              tags: ["93"],
            },
          ],
        };
      },
    });

    const result = await findTopicProblemsWithGateway(gateway, { topic: "SPFA", limit: 3 });
    expect(result.items.map((item) => item.id)).toEqual(["P4779"]);
  });

  test("findTopicProblemsWithGateway throws when all alias queries fail", async () => {
    const gateway = new FakeLuoguGateway({
      onSearchProblems: async () => {
        throw new Error("Upstream unreachable");
      },
    });

    await expect(findTopicProblemsWithGateway(gateway, { topic: "SPFA" })).rejects.toThrow("Upstream unreachable");
  });

  test("searchProblemSetsWithGateway deduplicates official and select training sets", async () => {
    const gateway = new FakeLuoguGateway({
      problemSetSearches: {
        "official:图论": [
          { id: "100", title: "顺序结构", sourceUrl: "https://www.luogu.com.cn/training/100", problemCount: 10 },
          { id: "208", title: "图论基础", sourceUrl: "https://www.luogu.com.cn/training/208", problemCount: 15 },
        ],
        "select:图论": [
          { id: "208", title: "图论基础", sourceUrl: "https://www.luogu.com.cn/training/208", problemCount: 15 },
          { id: "900", title: "精选 图论", sourceUrl: "https://www.luogu.com.cn/training/900", problemCount: 20 },
        ],
      },
    });

    const result = await searchProblemSetsWithGateway(gateway, { keyword: "图论", type: "all", limit: 10 });
    expect(result.items.map((item) => item.id)).toEqual(["208", "900"]);
    expect(result.total).toBe(2);
  });

  test("rankTopicProblems prioritizes template matches and moderate difficulty", () => {
    const candidates: ProblemSummary[] = [
      { platform: "luogu", id: "P1", title: "Hard problem", sourceUrl: "https://www.luogu.com.cn/problem/P1", difficulty: 7, tags: [] },
      { platform: "luogu", id: "P2", title: "【模板】最短路", sourceUrl: "https://www.luogu.com.cn/problem/P2", difficulty: 3, tags: [] },
      { platform: "luogu", id: "P3", title: "最短路练习", sourceUrl: "https://www.luogu.com.cn/problem/P3", difficulty: 2, tags: [] },
    ];

    const ranked = rankTopicProblems(candidates, "SPFA", "最短路", ["SPFA", "最短路"]);
    expect(ranked.map((item) => item.id)).toEqual(["P2", "P3", "P1"]);
  });

  test("recommendProblems falls back to query hints for unknown topics", () => {
    const result = recommendProblems({ topic: "segment_tree", painPoint: "lazy_tag", currentProblemId: "P1305" });
    expect(result.items).toEqual([]);
    expect(result.searchHints).toEqual(["segment_tree", "lazy_tag"]);
  });
});
