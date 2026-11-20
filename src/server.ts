import { McpServer } from "@modelcontextprotocol/server";
import {
  CachedLuoguGateway,
  LuoguClient,
  type CachedLuoguGatewayOptions,
  type LuoguClientOptions,
} from "./client/index.js";
import {
  LUOGU_MCP_TOOL_NAMES,
  createLuoguToolHandlers,
  registerLuoguTools,
} from "./mcp/index.js";
import type { LuoguGateway } from "./types.js";

export { LUOGU_MCP_TOOL_NAMES };

export interface CreateLuoguMcpServerOptions {
  gateway?: LuoguGateway;
  fetchImpl?: typeof fetch;
  cache?: boolean;
  clientOptions?: LuoguClientOptions;
  cacheOptions?: CachedLuoguGatewayOptions;
}

/** Build the default LuoguGateway composed with TTL caching + in-flight request coalescing. */
export function createDefaultLuoguGateway(options: CreateLuoguMcpServerOptions = {}): LuoguGateway {
  if (options.gateway) {
    return options.gateway;
  }

  const client = new LuoguClient({
    ...options.clientOptions,
    fetchImpl: options.fetchImpl ?? options.clientOptions?.fetchImpl,
  });

  if (options.cache === false) {
    return client;
  }

  return new CachedLuoguGateway(client, options.cacheOptions);
}

/** Create a configured Luogu MCP v2 server wired with decoupled handlers and gateway. */
export function createLuoguMcpServer(options: CreateLuoguMcpServerOptions = {}): McpServer {
  const server = new McpServer({
    name: "luogu-mcp-server",
    version: "0.2.1",
  });

  const gateway = createDefaultLuoguGateway(options);
  const handlers = createLuoguToolHandlers(gateway);
  registerLuoguTools(server, handlers);

  return server;
}
