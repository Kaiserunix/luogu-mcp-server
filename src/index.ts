#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createLuoguMcpServer } from "./server.js";

async function main(): Promise<void> {
  serveStdio(() => createLuoguMcpServer());
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`luogu-mcp-server failed: ${message}`);
  process.exit(1);
});
