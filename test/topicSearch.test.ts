import { describe, expect, test } from "vitest";
import { findTopicProblemsTool } from "../src/tools.js";

describe("topic problem search", () => {
  test("falls back from English aliases to Chinese topic queries", async () => {
    const calls: string[] = [];
    const fakeFetch = async (url: string | URL | Request): Promise<Response> => {
      calls.push(String(url));
      const href = String(url);
      const rows = href.includes("keyword=%E6%9C%80%E7%9F%AD%E8%B7%AF")
        ? [{ pid: "P4779", title: "【模板】单源最短路径（标准版）", difficulty: 3, tags: [93] }]
        : [];
      return new Response(JSON.stringify({ data: { problems: { count: rows.length, result: rows } } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    };

    const result = await findTopicProblemsTool({ topic: "SPFA", limit: 3 }, fakeFetch as typeof fetch);

    expect(result.queriesTried).toEqual(["SPFA", "最短路"]);
    expect(result.items[0].id).toBe("P4779");
    expect(result.items[0].reason).toContain("matched query: 最短路");
    expect(calls.length).toBe(2);
  });

  test("deduplicates results across multiple queries", async () => {
    const fakeFetch = async (): Promise<Response> =>
      new Response(
        JSON.stringify({
          data: {
            problems: {
              count: 2,
              result: [
                { pid: "P3369", title: "【模板】普通平衡树", difficulty: 4, tags: [42] },
                { pid: "P3369", title: "【模板】普通平衡树", difficulty: 4, tags: [42] }
              ]
            }
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );

    const result = await findTopicProblemsTool({ topic: "Treap", limit: 5 }, fakeFetch as typeof fetch);

    expect(result.items.map((item) => item.id)).toEqual(["P3369"]);
  });

  test("prefers template teaching problems over noisy alias matches", async () => {
    const fakeFetch = async (url: string | URL | Request): Promise<Response> => {
      const href = String(url);
      const rows = href.includes("keyword=Treap")
        ? [{ pid: "P4808", title: "[CCC 2018] 平衡树", difficulty: 6, tags: [42] }]
        : [{ pid: "P3369", title: "【模板】普通平衡树", difficulty: 4, tags: [42] }];
      return new Response(JSON.stringify({ data: { problems: { count: rows.length, result: rows } } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    };

    const result = await findTopicProblemsTool({ topic: "Treap", limit: 1 }, fakeFetch as typeof fetch);

    expect(result.items.map((item) => item.id)).toEqual(["P3369"]);
  });

  test("does not let unrelated template titles outrank topic title matches", async () => {
    const fakeFetch = async (): Promise<Response> =>
      new Response(
        JSON.stringify({
          data: {
            problems: {
              count: 2,
              result: [
                { pid: "P3375", title: "【模板】KMP", difficulty: 3, tags: [5] },
                { pid: "P5317", title: "简单模拟", difficulty: 1, tags: [1] }
              ]
            }
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );

    const result = await findTopicProblemsTool({ topic: "模拟", limit: 1 }, fakeFetch as typeof fetch);

    expect(result.items.map((item) => item.id)).toEqual(["P5317"]);
  });
});
