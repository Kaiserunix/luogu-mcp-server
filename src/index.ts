#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createLuoguMcpServer } from "./server.js";

async function main(): Promise<void> {
  const server = createLuoguMcpServer();
  await server.connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`luogu-mcp-server failed: ${message}`);
  process.exit(1);
});
