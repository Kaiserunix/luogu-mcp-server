import { describe, expect, test } from "vitest";
import worker from "../src/worker.js";

describe("Cloudflare Worker MCP entrypoint", () => {
  test("reports health and the MCP endpoint", async () => {
    const response = await worker.fetch(new Request("https://example.com/"), {});
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mcpEndpoint).toBe("/mcp");
    expect(body.tools).toContain("luogu_fetch_problem");
  });

  test("lists tools over stateless Streamable HTTP", async () => {
    const response = await worker.fetch(
      new Request("https://example.com/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list"
        })
      }),
      {}
    );
    const body = await parseMcpResponse(response);

    expect(response.status).toBe(200);
    expect(body.result.tools.map((tool: { name: string }) => tool.name)).toContain("luogu_find_topic_problems");
  });

  test("rejects browser origins unless explicitly allowed", async () => {
    const response = await worker.fetch(
      new Request("https://example.com/mcp", {
        method: "POST",
        headers: {
          origin: "https://evil.example",
          "content-type": "application/json",
          accept: "application/json, text/event-stream"
        },
        body: "{}"
      }),
      {}
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain("Origin");
  });

  test("requires a token when LUOGU_MCP_TOKEN is configured", async () => {
    const response = await worker.fetch(
      new Request("https://example.com/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream"
        },
        body: "{}"
      }),
      { LUOGU_MCP_TOKEN: "secret" }
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });
});

async function parseMcpResponse(response: Response): Promise<any> {
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    return JSON.parse(text);
  }

  const dataLines = text
    .split("\n")
    .filter((line) => line.startsWith("data: ") && line.length > 6);
  return JSON.parse(dataLines[dataLines.length - 1].slice(6));
}
