# luogu-mcp-server

A small stdio MCP server for Luogu problem discovery. It exposes Luogu problem search, problem fetch, training set search, training set fetch, and seed recommendations for model-driven coding practice.

## Why

This server is designed for AI tutoring and practice agents. The model can find a problem by topic, fetch the exact statement and samples, or ask for a bounded recommendation from a known topic or student pain point.

## Tools

| Tool | Purpose |
| --- | --- |
| `luogu_search_problems` | Search Luogu problems by keyword, topic, title fragment, or problem id. |
| `luogu_fetch_problem` | Fetch one Luogu problem statement, formats, samples, tags, difficulty, and URL by `pid`. |
| `luogu_search_problem_sets` | Search Luogu training/problem sets by keyword. |
| `luogu_fetch_problem_set` | Fetch one Luogu training/problem set and problem summaries by id. |
| `luogu_recommend_problems` | Return seed recommendations from a topic or student pain point. |

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

## Development

```powershell
cmd /c npm test
cmd /c npm run build
```

## Notes

- Luogu endpoints used here are content-only web endpoints, not a formal stability contract.
- The server keeps outputs compact and structured for model context control.
- Browser automation is intentionally not the default path. A Playwright fallback can be added later for pages that cannot be read through lightweight HTTP.
