import { afterEach, describe, expect, test, vi } from "vitest";
import { LuoguClient, LuoguClientError } from "../src/luoguClient.js";
import type { LuoguParser } from "../src/types.js";
import {
  CLOUDFLARE_CHALLENGE_HTML_FIXTURE,
  LOGIN_HTML_FIXTURE,
  PROBLEM_HTML_LENTILLE_FIXTURE,
  PROBLEM_P1305_PAYLOAD,
} from "./fixtures/luoguFixtures.js";

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

    const result = await new LuoguClient({ fetchImpl: fakeFetch as typeof fetch, retryDelaysMs: [0, 0] }).fetchProblem("P1001");

    expect(result.id).toBe("P1001");
    expect(attempts).toBe(2);
  });

  test("aborts and retries timed-out requests, then throws LuoguClientError(TIMEOUT)", async () => {
    let attempts = 0;
    const hangingFetch = (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      attempts += 1;
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(init.signal?.reason ?? new DOMException("Aborted", "AbortError"));
        });
      });
    };

    const client = new LuoguClient({
      fetchImpl: hangingFetch as typeof fetch,
      timeoutMs: 15,
      retryDelaysMs: [0],
    });

    await expect(client.fetchProblem("P1305")).rejects.toMatchObject({
      name: "LuoguClientError",
      code: "TIMEOUT",
      retryable: true,
    });
    expect(attempts).toBe(2);
  });

  test("does not retry non-transient HTTP 404 or 403 responses", async () => {
    let attempts = 0;
    const fakeFetch = async (): Promise<Response> => {
      attempts += 1;
      return new Response("not found", { status: 404 });
    };

    const client = new LuoguClient({
      fetchImpl: fakeFetch as typeof fetch,
      retryDelaysMs: [0, 0],
    });

    await expect(client.fetchProblem("P999999")).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
      retryable: false,
    });
    expect(attempts).toBe(1);
  });

  test("parses Lentille HTML fallback and surfaces login/challenge HTML errors cleanly", async () => {
    const htmlClient = new LuoguClient({
      fetchImpl: (async () =>
        new Response(PROBLEM_HTML_LENTILLE_FIXTURE, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        })) as typeof fetch,
    });
    const problem = await htmlClient.fetchProblem("P1001");
    expect(problem.id).toBe("P1001");

    const loginClient = new LuoguClient({
      fetchImpl: (async () =>
        new Response(LOGIN_HTML_FIXTURE, {
          status: 200,
          headers: { "content-type": "text/html" },
        })) as typeof fetch,
    });
    await expect(loginClient.fetchProblem("P1305")).rejects.toMatchObject({ code: "AUTH_REQUIRED" });

    const challengeClient = new LuoguClient({
      fetchImpl: (async () =>
        new Response(CLOUDFLARE_CHALLENGE_HTML_FIXTURE, {
          status: 200,
          headers: { "content-type": "text/html" },
        })) as typeof fetch,
    });
    await expect(challengeClient.fetchProblem("P1305")).rejects.toMatchObject({ code: "CHALLENGE_BLOCKED" });
  });

  test("rejects non-positive uid values instead of coercing them to uid 1", async () => {
    let called = false;
    const client = new LuoguClient({
      fetchImpl: (async () => {
        called = true;
        return new Response("{}");
      }) as typeof fetch,
    });

    await expect(client.fetchUserProfile(0)).rejects.toBeInstanceOf(LuoguClientError);
    await expect(client.fetchUserProfile(-5)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(called).toBe(false);
  });

  test("supports injecting a custom LuoguParser and baseUrl", async () => {
    const parserCalls: string[] = [];
    const customParser: LuoguParser = {
      extractPayload: (raw) => {
        parserCalls.push("extract");
        return JSON.parse(raw);
      },
      parseProblem: () => {
        parserCalls.push("parseProblem");
        return {
          platform: "luogu",
          id: "P1305",
          title: "Custom Parsed",
          sourceUrl: "https://mirror.example/problem/P1305",
          tags: [],
          statement: "stmt",
          inputFormat: "in",
          outputFormat: "out",
          samples: [],
        };
      },
      parseProblemSearch: () => ({ total: 0, items: [] }),
      parseProblemSetSearch: () => ({ total: 0, items: [] }),
      parseProblemSet: () => {
        throw new Error("unused");
      },
      parseUserProfile: () => {
        throw new Error("unused");
      },
    };

    const requestedUrls: string[] = [];
    const client = new LuoguClient({
      baseUrl: "https://mirror.example/",
      parser: customParser,
      fetchImpl: (async (url: string | URL | Request) => {
        requestedUrls.push(String(url));
        return new Response(JSON.stringify(PROBLEM_P1305_PAYLOAD), { status: 200 });
      }) as typeof fetch,
    });

    const record = await client.fetchProblem("p1305");
    expect(requestedUrls[0]).toBe("https://mirror.example/problem/P1305");
    expect(record.title).toBe("Custom Parsed");
    expect(parserCalls).toEqual(["extract", "parseProblem"]);
  });
});
