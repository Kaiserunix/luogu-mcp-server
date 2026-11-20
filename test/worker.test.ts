import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { describe, expect, test } from "vitest";
import worker, { createWorkerApp } from "../src/worker.js";
import { FakeLuoguGateway } from "./fixtures/luoguFixtures.js";

describe("Cloudflare Worker MCP entrypoint", () => {
  test("negotiates MCP 2026-07-28 over the Worker endpoint", async () => {
    const client = new Client(
      { name: "luogu-modern-worker-test", version: "1.0.0" },
      { versionNegotiation: { mode: "auto" } }
    );
    const transport = new StreamableHTTPClientTransport(new URL("https://example.com/mcp"), {
      fetch: (input, init) => worker.fetch(new Request(input, init), {})
    });

    await client.connect(transport);
    try {
      expect(client.getNegotiatedProtocolVersion()).toBe("2026-07-28");
      expect((await client.listTools()).tools.map((tool) => tool.name)).toContain("luogu_fetch_problem");
    } finally {
      await client.close();
    }
  });

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

  test("applies CORS headers to allowed origins on OPTIONS, 200, and 401 responses", async () => {
    const env = {
      LUOGU_MCP_TOKEN: "secret-token",
      LUOGU_MCP_ALLOWED_ORIGINS: "https://app.example.com",
    };

    const preflight = await worker.fetch(
      new Request("https://example.com/mcp", {
        method: "OPTIONS",
        headers: { origin: "https://app.example.com" },
      }),
      env
    );
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("https://app.example.com");

    const unauthorized = await worker.fetch(
      new Request("https://example.com/mcp", {
        method: "POST",
        headers: {
          origin: "https://app.example.com",
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: "{}",
      }),
      env
    );
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get("access-control-allow-origin")).toBe("https://app.example.com");

    const authorized = await worker.fetch(
      new Request("https://example.com/mcp", {
        method: "POST",
        headers: {
          origin: "https://app.example.com",
          "x-luogu-mcp-token": "secret-token",
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      }),
      env
    );
    expect(authorized.status).toBe(200);
    expect(authorized.headers.get("access-control-allow-origin")).toBe("https://app.example.com");
  });

  test("returns 404 for unknown routes and executes tools via injected gateway", async () => {
    const app = createWorkerApp({ gateway: new FakeLuoguGateway() });

    const missing = await app.fetch(new Request("https://example.com/unknown"), {});
    expect(missing.status).toBe(404);

    const callRes = await app.fetch(
      new Request("https://example.com/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "luogu_fetch_problem",
            arguments: { pid: "P1305" },
          },
        }),
      }),
      {}
    );
    const body = await parseMcpResponse(callRes);
    expect(callRes.status).toBe(200);
    expect(body.result.structuredContent).toMatchObject({ id: "P1305", title: "新二叉树" });
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
