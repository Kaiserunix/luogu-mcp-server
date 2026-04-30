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
});
