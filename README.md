# luogu-mcp-server

A small stdio MCP server for Luogu problem discovery. It exposes a LeetCode-MCP-style Luogu route for problem search, problem fetch, URL/id resolution, related practice discovery, training set search, training set fetch, public user profiles, and explicit capability reporting.

## Why

This server is designed for AI tutoring and practice agents. The model can find a problem by topic, fetch the exact statement and samples, or ask for a bounded recommendation from a known topic or student pain point.

## Tools

| Tool | Purpose |
| --- | --- |
| `luogu_search_problems` | Search Luogu problems by keyword, topic, title fragment, or problem id. |
| `luogu_fetch_problem` | Fetch one Luogu problem statement, formats, samples, tags, difficulty, and URL by `pid`. |
| `luogu_resolve_problem` | Resolve a Luogu URL, problem id, or title fragment, then fetch the problem. |
| `luogu_find_related_problems` | Mix topic/pain-point recommendations with live keyword search to find related practice. |
| `luogu_search_problem_sets` | Search Luogu training/problem sets by keyword. |
| `luogu_fetch_problem_set` | Fetch one Luogu training/problem set and problem summaries by id. |
| `luogu_recommend_problems` | Return seed recommendations from a topic or student pain point. |
| `luogu_get_user_profile` | Fetch public Luogu user profile data by uid. |
| `luogu_get_capabilities` | Report which LeetCode-style route features are available, auth-required, or planned. |

All tools are read-only.

## Install From Source

```powershell
git clone https://github.com/kaiserunix/luogu-mcp-server.git
cd luogu-mcp-server
cmd /c npm install
cmd /c npm run build
```

## MCP Client Config

Use `node` directly as the stdio command:

```json
{
  "mcpServers": {
    "luogu": {
      "command": "node",
      "args": [
        "C:\\Users\\qwerf\\Desktop\\luogu-mcp-server\\dist\\index.js"
      ],
      "cwd": "C:\\Users\\qwerf\\Desktop\\luogu-mcp-server"
    }
  }
}
```

After publishing to npm, the intended config is:

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

## Example Calls

Search problems:

```json
{
  "keyword": "二叉树",
  "page": 1,
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

Fetch a public user profile:

```json
{
  "uid": 1
}
```

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

Run broad live checks against Luogu's current website responses:

```powershell
cmd /c npm run smoke:live
```

The live smoke starts the MCP server through a real stdio client, then compares problem fetches, problem searches, training searches, training fetches, URL/id resolution, related recommendations, public user profiles, and route capabilities against Luogu content-only page responses. It is intentionally separate from unit tests because it depends on Luogu network availability and current site behavior.

## Notes

- Luogu endpoints used here are content-only web endpoints, not a formal stability contract.
- The server keeps outputs compact and structured for model context control.
- Browser automation is intentionally not the default path. A Playwright fallback can be added later for pages that cannot be read through lightweight HTTP.
- For broad topic discovery, Luogu training-set search is often cleaner than raw problem title search; raw keyword search follows Luogu's website ordering and can include title-level noise.
