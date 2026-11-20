# Luogu MCP Server | 洛谷 MCP Server

**[简体中文](README.zh-CN.md) | [Product Strategy & Roadmap](docs/PRODUCT_STRATEGY.md) | [Multi-OJ Monorepo (`ketherworks`)](https://github.com/ketherworks/competitive-programming-mcp)**

**The 11-tool Luogu Deep Pedagogy & Topic-Discovery MCP Server** — search Luogu problems, read context-safe statements and samples, explore **100 algorithm topics** with bilingual alias expansion & `【模板】` template prioritization, search **official + user-shared training sets (`题单`)**, and get beginner pain-point recommendations. Runs zero-install over Streamable HTTP or locally via npm (`npx -y luogu-mcp-server`).

> **All 11 tools are strictly read-only** (public Luogu problems, training sets, recommendations, and public user profiles; no account login or code submission).

---

## Which Luogu / OJ MCP Repo Should I Use?

| Repository | Edition & Tools | Best For | Connection |
| --- | --- | --- | --- |
| **`Kaiserunix/luogu-mcp-server`** *(this repo)* | **Luogu Deep Pedagogy Edition** (`luogu-v0.2`, **11 `luogu_*` tools**) | **100-topic bilingual alias catalog**, **official + selected training sets (`题单`)**, **pain-point practice recommendations**, public user profiles, and offline Markdown topic-pack export | Hosted HTTP `https://luogu-mcp.ksrnyx.top/mcp` or `npx -y luogu-mcp-server` |
| **[`ketherworks/competitive-programming-mcp`](https://github.com/ketherworks/competitive-programming-mcp)** | **Unified Multi-OJ Contract Suite** (`OJ v1`, **4 `oj_*` read tools** per hosted OJ + NowCoder local runner) | Multi-platform agents needing one typed `oj_*` schema across **Codeforces** (metadata), **AtCoder** (statements), **Luogu** (`https://api.ksrnyx.top/oj-mcp/luogu/mcp`), **NowCoder** (local stdio run & confirmed submit), and **LeetCode** | Hosted HTTP + local `stdio` for NowCoder |

---

## Quick Start

### Option 1: Zero-Install Hosted Streamable HTTP

**Cursor / Windsurf / Clients using `"mcpServers"`:**

```json
{
  "mcpServers": {
    "luogu": {
      "url": "https://luogu-mcp.ksrnyx.top/mcp"
    }
  }
}
```

**VS Code (`.vscode/mcp.json`, uses `"servers"` + `"type": "http"`):**

```json
{
  "servers": {
    "luogu": {
      "type": "http",
      "url": "https://luogu-mcp.ksrnyx.top/mcp"
    }
  }
}
```

### Option 2: Local `stdio` via npm (Recommended for Claude Desktop or Avoiding Remote Egress Limits)

Requires **Node.js >= 20**. Uses the published [`luogu-mcp-server`](https://www.npmjs.com/package/luogu-mcp-server) package:

**macOS / Linux:**

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

**Windows (wrap `npx` via `cmd /c` if your MCP host reports `spawn npx ENOENT`):**

```json
{
  "mcpServers": {
    "luogu": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "luogu-mcp-server"]
    }
  }
}
```

### Try Asking Your AI Client

```text
Search Luogu for five beginner binary-tree problems.
Fetch Luogu P1305 with its statement and samples.
Find Treap topic practice problems excluding P3369.
Search Luogu training sets for 网络流.
Find related practice for traversal-order confusion.
```

---

## Why This Server Stands Out

- **100-Topic Bilingual Alias & Template-Prioritized Discovery (`luogu_find_topic_problems`)**: Expands OI shorthand (`Treap`, `SPFA`, `状压`, `割边`) into canonical topics & Luogu tag IDs, boosts `【模板】` template problems and approachable difficulties, and is verified by a 100-topic live smoke test (`>=98/100` hit threshold).
- **Hybrid Official + Community Training-Set Search (`luogu_search_problem_sets`)**: Fetches Luogu's official training index and community `select` sets in parallel, normalizes title filtering across both, and deduplicates results under `type: "all"`.
- **Context-Safe Statement Trimming**: Normalizes Luogu's multi-schema content payloads and bounds long stories via `maxStatementChars` (default `5000`) so LLM context windows stay clean.
- **Offline 100-Topic Markdown Pack**: Run `npm run download:topics` to export one representative problem per algorithm topic as clean local Markdown cards.

---

## Tools (11 Read-Only Tools)

| Tool | Purpose |
| --- | --- |
| `luogu_find_topic_problems` | **Primary 100-topic discovery engine**: finds topic practice using bilingual aliases, Luogu tag IDs, template prioritization, deduplication, and match reasons. |
| `luogu_list_algorithm_topics` | List all 100 canonical algorithm topics, aliases, and known Luogu tag IDs. |
| `luogu_search_problems` | Search Luogu problems by keyword, topic, title fragment, problem ID, and optional Luogu tag IDs. |
| `luogu_fetch_problem` | Fetch one Luogu problem statement, input/output formats, samples, tags, difficulty, and URL by `pid`. |
| `luogu_resolve_problem` | Resolve a Luogu URL, problem ID, or title fragment, then fetch the problem *(for `B`-prefix problems like `B2002`, call `luogu_fetch_problem` directly with `pid`)*. |
| `luogu_search_problem_sets` | Search Luogu training/problem sets (`题单`) by keyword. Supports `type: "all" | "official" | "select"` (`all` merges filtered official index + selected user-shared sets). |
| `luogu_fetch_problem_set` | Fetch one Luogu training/problem set and its problem summaries by ID. |
| `luogu_find_related_problems` | Combine topic/pain-point recommendations with live keyword search to find related practice. |
| `luogu_recommend_problems` | Return curated beginner seed recommendations for 6 targeted pain-point buckets (`binary_tree`, `tree_distance`, `recursion`, `output_order`, `output_format`, `matrix`). |
| `luogu_get_user_profile` | Fetch public Luogu user profile data by `uid`. |
| `luogu_get_capabilities` | Report which LeetCode-style route features are available, auth-required, or intentionally not enabled. |

---

## Availability

- **Hosted MCP**: `https://luogu-mcp.ksrnyx.top/mcp`
- **Health Check**: `https://luogu-mcp.ksrnyx.top/health`
- **npm Package**: [`luogu-mcp-server`](https://www.npmjs.com/package/luogu-mcp-server)
- **Official MCP Registry**: `io.github.Kaiserunix/luogu-mcp-server`, described by [`server.json`](server.json)

---

## Other Ways To Run (From Source)

```powershell
git clone https://github.com/Kaiserunix/luogu-mcp-server.git
cd luogu-mcp-server
npm install
npm run build
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

---

## Example Tool Payloads

<details>
<summary><strong>Click to expand JSON argument examples for common tools</strong></summary>

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

Resolve a pasted URL:

```json
{
  "query": "https://www.luogu.com.cn/problem/P1305",
  "maxStatementChars": 5000
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

Recommend from a beginner pain point:

```json
{
  "topic": "binary_tree",
  "painPoint": "traversal_order_confusion",
  "limit": 3
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

Fetch a public user profile:

```json
{
  "uid": 1
}
```

Search training/problem sets (`type: "all"` is the default; use `"official"` for official index only or `"select"` for user-shared sets):

```json
{
  "keyword": "网络流",
  "type": "select",
  "limit": 5
}
```

</details>

---

## Luogu Route Parity & Scope

This project mirrors the useful ergonomics of mature LeetCode MCP servers while strictly respecting what Luogu exposes publicly:

- **Available now**: problem search, problem fetch, URL/ID/title resolution, 100-topic & related problem discovery, training-set search/fetch, public user profile fetch.
- **Auth-required in live probes (not enabled)**: recent submissions, public solution pages, and discussion pages.
- **Intentionally not enabled**: solution submission / remote code execution (requires authenticated sessions and explicit write-tool safety gates).

---

## Development & Smoke Verification

```powershell
npm test
npm run build
```

Optional live verification scripts (depend on live Luogu network availability):

| Command | Purpose |
| --- | --- |
| `npm run smoke:live` | End-to-end stdio MCP verification against live Luogu content responses |
| `npm run smoke:topics` | Probes all 100 algorithm categories across topic & training-set search (fails if `< 98` return results) |
| `npm run download:topics` | Exports one representative problem per topic into a local gitignored Markdown folder |
| `npm run smoke:mimo` | Runs an agent tool-calling smoke loop against the local stdio MCP server (reads `MIMO_API_KEY` from the environment or a local `.env` file) |

---

## Cloudflare Worker Deployment & Egress Caveat

> [!WARNING]
> **Upstream Egress Blocking Caveat**: Luogu (`www.luogu.com.cn`) frequently blocks or rate-limits shared Cloudflare Worker egress IPs on real problem/search reads even when `/health` and MCP handshakes succeed. For reliable self-hosted reads, prefer **local `npx -y luogu-mcp-server` (`stdio`)** or a **Node 22 container behind HTTPS / private tunnel** (see [`ketherworks/competitive-programming-mcp`](https://github.com/ketherworks/competitive-programming-mcp/blob/main/docs/deployment/production-endpoints.md)).

This package includes a stateless Streamable HTTP MCP Worker entrypoint (`src/worker.ts`) if your egress route can reach Luogu reliably:

```powershell
npm test
npm run smoke:cf
npx wrangler login
npm run deploy:cf:dry
npm run deploy:cf
```

Verify a deployed Worker (be sure to test a real read tool, not only `/health`):

```powershell
npm run smoke:cf -- https://<your-worker-name>.<your-workers-subdomain>.workers.dev
```

For private deployments, set `LUOGU_MCP_TOKEN` with `wrangler secret put` and send `Authorization: Bearer <token>` (or `X-Luogu-Mcp-Token`). Browser `Origin` requests are rejected by default; set `LUOGU_MCP_ALLOWED_ORIGINS` to a comma-separated origin list if browser access is needed. See [`docs/cloudflare-deployment.md`](docs/cloudflare-deployment.md) for the full checklist.

## Notes

- Luogu endpoints used here are public content-only web endpoints, not a formal OpenAPI stability contract.
- Outputs stay compact and structured to preserve model context budget.
- Browser automation is intentionally not on the default path.
- For broad topic discovery, Luogu training-set search (`luogu_search_problem_sets`) and topic discovery (`luogu_find_topic_problems`) are generally cleaner than raw problem title search.
