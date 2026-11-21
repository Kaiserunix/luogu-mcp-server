#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createDefaultLuoguGateway, createLuoguMcpServer } from "./server.js";

async function main(): Promise<void> {
  const sharedGateway = createDefaultLuoguGateway();
  serveStdio(() => createLuoguMcpServer({ gateway: sharedGateway }));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`luogu-mcp-server failed: ${message}`);
  process.exit(1);
});
