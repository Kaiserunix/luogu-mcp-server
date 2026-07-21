# Luogu MCP Server | 洛谷 MCP Server

[中文文档](README.zh-CN.md)

A small MCP server for searching Luogu problems, reading statements and training sets, and finding related practice. It can run locally through npm or as a hosted Streamable HTTP server.

## Quick Start

Use the hosted read-only server without installing anything:

```json
{
  "mcpServers": {
    "luogu": {
      "url": "https://luogu-mcp-server.lantangtang54.workers.dev/mcp"
    }
  }
}
```

To keep the server on your machine, use the published [`luogu-mcp-server`](https://www.npmjs.com/package/luogu-mcp-server) package:

```json
{
  "mcpServers": {
    "luogu": {
      "command": "npx",
      "args": ["-y", "luogu-mcp-server"]
    }
  }
}
```

Then ask:

```text
Search Luogu for five beginner binary-tree problems.
Fetch Luogu P1305 with its statement and samples.
Find related practice for traversal-order confusion.
```

## Tools

| Tool | Purpose |
| --- | --- |
| `luogu_search_problems` | Search Luogu problems by keyword, topic, title fragment, problem id, and optional Luogu tag ids. |
| `luogu_fetch_problem` | Fetch one Luogu problem statement, formats, samples, tags, difficulty, and URL by `pid`. |
| `luogu_resolve_problem` | Resolve a Luogu URL, problem id, or title fragment, then fetch the problem. |
| `luogu_find_related_problems` | Mix topic/pain-point recommendations with live keyword search to find related practice. |
| `luogu_list_algorithm_topics` | List canonical algorithm topics, aliases, and known tag ids. |
| `luogu_find_topic_problems` | Find topic practice problems using aliases, tag ids, deduplication, and match reasons. |
| `luogu_search_problem_sets` | Search Luogu training/problem sets by keyword. Supports `type: "all" | "official" | "select"` because Luogu's current official-list endpoint only exposes the public official index, while selected user-shared sets support keyword search. |
| `luogu_fetch_problem_set` | Fetch one Luogu training/problem set and problem summaries by id. |
| `luogu_recommend_problems` | Return seed recommendations from a topic or student pain point. |
| `luogu_get_user_profile` | Fetch public Luogu user profile data by uid. |
| `luogu_get_capabilities` | Report which LeetCode-style route features are available, auth-required, or planned. |

All tools are read-only.

## Availability

- Hosted MCP: `https://luogu-mcp-server.lantangtang54.workers.dev/mcp`
- Health: `https://luogu-mcp-server.lantangtang54.workers.dev/health`
- Official MCP Registry: `io.github.Kaiserunix/luogu-mcp-server`, described by [`server.json`](server.json)

## Other Ways To Run

From source:

```powershell
git clone https://github.com/kaiserunix/luogu-mcp-server.git
cd luogu-mcp-server
cmd /c npm install
cmd /c npm run build
```

Use `node` directly from a source checkout:

```json
{
  "mcpServers": {
    "luogu": {
      "command": "node",
      "args": [
        "C:\\path\\to\\luogu-mcp-server\\dist\\index.js"
      ],
      "cwd": "C:\\path\\to\\luogu-mcp-server"
    }
  }
}
```

## Example Calls

Search problems:

```json
{
  "keyword": "二叉树",
  "page": 1,
  "limit": 5
}
```

Search problems with a Luogu tag filter:

```json
{
  "keyword": "二叉树",
  "tagIds": [11],
  "limit": 5
}
```

Fetch a problem:

```json
{
  "pid": "P1305",
  "maxStatementChars": 5000
}
```

Recommend from a pain point:

```json
{
  "topic": "binary_tree",
  "painPoint": "traversal_order_confusion",
  "limit": 3
}
```

Resolve a pasted URL:

```json
{
  "query": "https://www.luogu.com.cn/problem/P1305",
  "maxStatementChars": 5000
}
```

Find related practice:

```json
{
  "topic": "binary_tree",
  "painPoint": "traversal_order_confusion",
  "query": "二叉树 遍历",
  "limit": 5
}
```

Find topic practice with alias expansion:

```json
{
  "topic": "Treap",
  "limit": 5,
  "excludeProblemIds": ["P3369"]
}
```

Fetch a public user profile:

```json
{
  "uid": 1
}
```

Search training/problem sets:

```json
{
  "keyword": "网络流",
  "type": "select",
  "limit": 5
}
```

`type: "all"` is the default. It combines title-filtered official sets with selected user-shared set search. Use `type: "official"` for the public official index, or `type: "select"` for selected user-shared sets.

## Luogu Route Parity

This project mirrors the useful shape of richer LeetCode MCP servers while respecting what Luogu exposes publicly:

- Available now: problem search, problem fetch, URL/id/title resolution, related problem discovery, training set search/fetch, public user profile fetch.
- Auth-required in live probes: recent submissions, public solution pages, and discussion pages.
- Planned but intentionally not enabled: solution submission/run-code tools. Those require authenticated session handling and explicit write-tool safety gates.

## Development

```powershell
cmd /c npm test
cmd /c npm run build
```

## Cloudflare Worker Deployment

This package also includes a stateless Streamable HTTP MCP entrypoint for Cloudflare Workers.

```powershell
cmd /c npm test
cmd /c npm run smoke:cf
cmd /c npx wrangler login
cmd /c npm run deploy:cf:dry
cmd /c npm run deploy:cf
```

The Worker exposes the same read-only tools at `/mcp`, with a health endpoint at `/` or `/health`.

```json
{
  "mcpServers": {
    "luogu": {
      "url": "https://<your-worker-name>.<your-workers-subdomain>.workers.dev/mcp"
    }
  }
}
```

Verify a deployed Worker:

```powershell
cmd /c npm run smoke:cf -- https://<your-worker-name>.<your-workers-subdomain>.workers.dev
```

For private deployments, set `LUOGU_MCP_TOKEN` with `wrangler secret put` and configure your MCP client to send an `Authorization: Bearer <token>` header where supported. Browser `Origin` requests are rejected by default; set `LUOGU_MCP_ALLOWED_ORIGINS` to a comma-separated origin list if browser access is needed.

See `docs/cloudflare-deployment.md` for the full release checklist.

Run broad live checks against Luogu's current website responses:

```powershell
cmd /c npm run smoke:live
```

The live smoke starts the MCP server through a real stdio client, then compares problem fetches, problem searches, training searches, training fetches, URL/id resolution, related recommendations, public user profiles, and route capabilities against Luogu content-only page responses. It is intentionally separate from unit tests because it depends on Luogu network availability and current site behavior.

Run the 100-topic algorithm coverage smoke:

```powershell
cmd /c npm run smoke:topics
```

The topic smoke starts the real MCP server and probes 100 algorithm categories across high-level topic search and training-set search. It fails if fewer than 98 topic searches return Luogu results.

Download one representative problem per catalog topic into a local ignored folder:

```powershell
cmd /c npm run download:topics
```

Test a MiMo agent loop that asks the model to choose MCP tools, then executes those calls through the local stdio MCP server:

```powershell
cmd /c npm run smoke:mimo
```

`smoke:mimo` reads `MIMO_API_KEY` from the environment, or from `C:\Users\qwerf\.continue\.env` on this machine.

## Notes

- Luogu endpoints used here are content-only web endpoints, not a formal stability contract.
- The server keeps outputs compact and structured for model context control.
- Browser automation is intentionally not the default path. A Playwright fallback can be added later for pages that cannot be read through lightweight HTTP.
- For broad topic discovery, Luogu training-set search is often cleaner than raw problem title search; raw keyword search follows Luogu's website ordering and can include title-level noise.
