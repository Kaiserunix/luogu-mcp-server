import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createLuoguMcpServer, LUOGU_MCP_TOOL_NAMES } from "./server.js";

interface WorkerEnv {
  LUOGU_MCP_ALLOWED_ORIGINS?: string;
  LUOGU_MCP_TOKEN?: string;
}

const MCP_PATH = "/mcp";
const CORS_HEADERS = "authorization, content-type, accept, mcp-protocol-version, mcp-session-id, last-event-id, x-luogu-mcp-token";

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return jsonResponse({
        name: "luogu-mcp-server",
        transport: "streamable-http",
        mcpEndpoint: MCP_PATH,
        tools: LUOGU_MCP_TOOL_NAMES
      });
    }

    if (url.pathname !== MCP_PATH) {
      return jsonResponse({ error: "Not found", mcpEndpoint: MCP_PATH }, 404);
    }

    if (request.method === "OPTIONS") {
      return handleOptions(request, env);
    }

    const originError = validateOrigin(request, env);
    if (originError) {
      return originError;
    }

    const authError = validateToken(request, env);
    if (authError) {
      return authError;
    }

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });
    const server = createLuoguMcpServer();
    await server.connect(transport);

    const response = await transport.handleRequest(request);
    return withCorsHeaders(response, request, env);
  }
};

function handleOptions(request: Request, env: WorkerEnv): Response {
  const originError = validateOrigin(request, env);
  if (originError) {
    return originError;
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, env)
  });
}

function validateOrigin(request: Request, env: WorkerEnv): Response | undefined {
  const origin = request.headers.get("origin");
  if (!origin) {
    return undefined;
  }

  const allowedOrigins = csv(env.LUOGU_MCP_ALLOWED_ORIGINS);
  if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
    return undefined;
  }

  return jsonResponse(
    {
      error: "Origin is not allowed.",
      hint: "Set LUOGU_MCP_ALLOWED_ORIGINS to a comma-separated list of browser origins if you need browser access."
    },
    403
  );
}

function validateToken(request: Request, env: WorkerEnv): Response | undefined {
  const expected = env.LUOGU_MCP_TOKEN?.trim();
  if (!expected) {
    return undefined;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const tokenHeader = request.headers.get("x-luogu-mcp-token")?.trim();
  if (bearer === expected || tokenHeader === expected) {
    return undefined;
  }

  return jsonResponse({ error: "Unauthorized" }, 401, {
    "WWW-Authenticate": 'Bearer realm="luogu-mcp-server"'
  });
}

function withCorsHeaders(response: Response, request: Request, env: WorkerEnv): Response {
  const origin = request.headers.get("origin");
  if (!origin) {
    return response;
  }

  const headers = new Headers(response.headers);
  corsHeaders(request, env).forEach((value, key) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function corsHeaders(request: Request, env: WorkerEnv): Headers {
  const headers = new Headers();
  const origin = request.headers.get("origin");
  const allowedOrigins = csv(env.LUOGU_MCP_ALLOWED_ORIGINS);

  if (origin && (allowedOrigins.includes("*") || allowedOrigins.includes(origin))) {
    headers.set("Access-Control-Allow-Origin", allowedOrigins.includes("*") ? "*" : origin);
    headers.set("Vary", "Origin");
  }

  headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", CORS_HEADERS);
  headers.set("Access-Control-Expose-Headers", "mcp-session-id");
  return headers;
}

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders
    }
  });
}

function csv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
