# Cloudflare Worker Deployment

This project ships two MCP entrypoints:

- `src/index.ts`: stdio transport for local desktop MCP clients.
- `src/worker.ts`: stateless Streamable HTTP transport for Cloudflare Workers.

The Worker endpoint is read-only and exposes the same Luogu tools at `/mcp`.

## Recommended Choice

For this workload, Cloudflare Workers is the default public deployment target. A small read-only MCP server usually does not justify keeping a personal VPS process alive unless you need private network access, custom logs on your own host, or non-HTTP long-running work.

## First Deploy

```powershell
cmd /c npm install
cmd /c npm test
cmd /c npm run smoke:cf
cmd /c npx wrangler login
cmd /c npm run deploy:cf:dry
cmd /c npm run deploy:cf
```

The deployed MCP endpoint will be:

```text
https://<your-worker-name>.<your-workers-subdomain>.workers.dev/mcp
```

Verify a deployed Worker:

```powershell
cmd /c npm run smoke:cf -- https://<your-worker-name>.<your-workers-subdomain>.workers.dev
```

## Optional Access Controls

For private use, set a bearer token:

```powershell
cmd /c npx wrangler secret put LUOGU_MCP_TOKEN
```

Clients must then send either:

```text
Authorization: Bearer <token>
```

or:

```text
X-Luogu-Mcp-Token: <token>
```

Browser requests with an `Origin` header are rejected by default. To allow specific browser origins:

```powershell
cmd /c npx wrangler secret put LUOGU_MCP_ALLOWED_ORIGINS
```

Use a comma-separated value such as:

```text
https://example.com,https://app.example.com
```

## MCP Client Config

Use the Streamable HTTP URL:

```json
{
  "mcpServers": {
    "luogu": {
      "url": "https://<your-worker-name>.<your-workers-subdomain>.workers.dev/mcp"
    }
  }
}
```

If you configured `LUOGU_MCP_TOKEN`, add client-specific HTTP headers where your MCP client supports them.

## Post-Deploy Checklist

1. Open `/health` and confirm it returns the tool names.
2. Run `cmd /c npm run smoke:cf -- https://<worker-url>`.
3. Add the remote MCP URL to one client and run `tools/list`.
4. Call `luogu_fetch_problem` with `P1001`.
5. Watch Cloudflare Workers logs for 4xx/5xx spikes.
6. Keep `npm run smoke:live` separate because it depends on Luogu's current website responses.
