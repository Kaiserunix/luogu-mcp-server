import { afterEach, describe, expect, test, vi } from "vitest";
import { LuoguClient } from "../src/luoguClient.js";

describe("LuoguClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("does not call the default fetch with the client instance as this", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      function (this: unknown, input: RequestInfo | URL): Promise<Response> {
        if (this instanceof LuoguClient) {
          throw new Error("Illegal invocation");
        }

        calls.push(String(input));
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                problem: {
                  pid: "P1001",
                  title: "A+B Problem",
                  description: "Calculate a plus b.",
                  inputFormat: "a b",
                  outputFormat: "a+b",
                  samples: [["1 2", "3"]]
                }
              }
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          )
        );
      } as typeof fetch
    );

    const result = await new LuoguClient().fetchProblem("P1001");

    expect(result.id).toBe("P1001");
    expect(calls[0]).toContain("/problem/P1001");
  });

  test("uses the current Lentille content-only adapter for training endpoints", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fakeFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      calls.push({ url: String(url), init });
      const href = String(url);
      if (href.includes("/training/list")) {
        return new Response(
          JSON.stringify({ data: { trainings: { count: 1, result: [{ id: 100, name: "【入门1】顺序结构", problemCount: 15 }] } } }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          data: {
            training: {
              id: 100,
              name: "【入门1】顺序结构",
              problemCount: 1,
              problems: [{ pid: "B2002", title: "Hello,World!", difficulty: 1, tags: [353] }]
            }
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    };

    const client = new LuoguClient({ fetchImpl: fakeFetch as typeof fetch });
    await client.searchProblemSets({ keyword: "入门" });
    await client.fetchProblemSet("100");

    for (const call of calls) {
      const headers = new Headers(call.init?.headers);
      expect(headers.get("x-lentille-request")).toBe("content-only");
      expect(headers.get("x-luogu-type")).toBeNull();
      expect(headers.get("accept")).toContain("application/json");
      expect(headers.get("referer")).toBe("https://www.luogu.com.cn/");
    }
  });

  test("retries transient Luogu HTTP failures", async () => {
    let attempts = 0;
    const fakeFetch = async (): Promise<Response> => {
      attempts += 1;
      if (attempts === 1) {
        return new Response("temporary", { status: 503 });
      }

      return new Response(
        JSON.stringify({
          data: {
            problem: {
              pid: "P1001",
              name: "A+B Problem",
              description: "Calculate a plus b.",
              samples: []
            }
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    };

    const result = await new LuoguClient({ fetchImpl: fakeFetch as typeof fetch }).fetchProblem("P1001");

    expect(result.id).toBe("P1001");
    expect(attempts).toBe(2);
  });
});
