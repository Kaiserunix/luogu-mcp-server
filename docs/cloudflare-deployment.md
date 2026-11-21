# Cloudflare Worker Deployment

This package ships two MCP entrypoints:

- `src/index.ts`: local stdio transport (`serveStdio`) for desktop MCP clients.
- `src/worker.ts`: stateless Streamable HTTP transport (`createMcpHandler` with `{ responseMode: "json" }` from `@modelcontextprotocol/server` v2) for Cloudflare Workers.

Both entrypoints expose the same 11 read-only Luogu tools. On the Worker, MCP requests are served at `/mcp` and JSON health metadata is served at `/` and `/health`.

## Recommended Target

Cloudflare Workers is the default public deployment target for this read-only server. A personal VPS is only necessary if you need private-network routing, custom host-side logging, or long-running non-HTTP work.

## Configuration (`wrangler.jsonc`)

- Worker name: `luogu-mcp-server` (`main: "src/worker.ts"`, `compatibility_date: "2026-08-01"`, `observability.enabled: true`).
- Public routes: `workers_dev: true` plus the custom domain route `luogu-mcp.ksrnyx.top` (registered in `server.json` as `https://luogu-mcp.ksrnyx.top/mcp`). Update or remove `routes` in `wrangler.jsonc` when deploying to your own Cloudflare account.

## First Deploy

```bash
npm install
npm test
npm run smoke:cf
npx wrangler login
npm run deploy:cf:dry
npm run deploy:cf
```

The deployed MCP endpoint is:

```text
https://<your-worker-name>.<your-workers-subdomain>.workers.dev/mcp
```

Verify a deployed Worker (checks `GET /` health metadata and `POST /mcp` `tools/list`):

```bash
npm run smoke:cf -- https://<your-worker-name>.<your-workers-subdomain>.workers.dev
```

If `LUOGU_MCP_TOKEN` is configured on the Worker, export `LUOGU_MCP_TOKEN` in your shell before running `npm run smoke:cf -- <url>` so the smoke script sends `Authorization: Bearer <token>`.

## Optional Access Controls

For private deployments, configure a bearer token secret:

```bash
npx wrangler secret put LUOGU_MCP_TOKEN
```

When set, `/mcp` requests without a matching token fail with HTTP `401` (`WWW-Authenticate: Bearer realm="luogu-mcp-server"`). Clients must send either:

```text
Authorization: Bearer <token>
```

or:

```text
X-Luogu-Mcp-Token: <token>
```

Browser requests carrying an `Origin` header are rejected with HTTP `403` by default. To allow specific browser origins (or `*` for wildcard CORS):

```bash
npx wrangler secret put LUOGU_MCP_ALLOWED_ORIGINS
```

Use a comma-separated list such as:

```text
https://example.com,https://app.example.com
```

## MCP Client Config

```json
{
  "mcpServers": {
    "luogu": {
      "url": "https://<your-worker-name>.<your-workers-subdomain>.workers.dev/mcp"
    }
  }
}
```

If `LUOGU_MCP_TOKEN` is enabled, add the corresponding HTTP header in your MCP client configuration.

## Post-Deploy Checklist

1. Open `/` or `/health` and confirm it returns `mcpEndpoint: "/mcp"` and all 11 tool names.
2. Run `npm run smoke:cf -- https://<worker-url>`.
3. Add the remote MCP URL to one client and run `tools/list`.
4. Call `luogu_fetch_problem` with `P1001`.
5. Watch Cloudflare Workers observability logs for 4xx/5xx spikes.
6. Keep `npm run smoke:live` separate from CI because it depends on live Luogu website responses.
