# User Journey & Microcopy Deck: Luogu MCP Server (`Kaiserunix/luogu-mcp-server`)

> **Document Purpose**: Ready-to-ship product copy, per-client onboarding cards, MCP tool-description rewrites, Socratic coaching prompt templates, and error/empty-state microcopy for `Kaiserunix/luogu-mcp-server` (`v0.2.1`, 11-tool Luogu Coaching & Topic-Discovery Edition).
> **Scope & Code Truthfulness**: Grounded strictly in `src/server.ts`, `src/tools.ts`, `src/luoguClient.ts`, `src/normalizers.ts`, `src/recommendations.ts`, `src/topicCatalog.ts`, `src/topicSearch.ts`, and `src/worker.ts`, incorporating simulated OI/ACM user findings from `@ux-sim-4`.

---

## 1. Product Positioning & Portfolio Disambiguation Copy

### 1.1 Bilingual Hero Hook (Drop-in Replacement for Top of `README.md` / `README.zh-CN.md`)

**English (`README.md`)**:
> **Luogu MCP Server — The 11-Tool AI Algorithm Coaching & Problem Discovery Server for Luogu (洛谷)**
>
> Give Cursor, VS Code Copilot, Claude Desktop, Windsurf, or your custom tutoring agent instant read-only access to Luogu's problem bank, **100-topic bilingual algorithm catalog** (`SPFA` → `最短路`, `Treap` → `平衡树`, with automatic `【模板】` prioritization), **student pain-point remediation buckets**, and **official/community training sets (`题单`)**.
>
> - **Zero-Install Hosted HTTP**: `https://luogu-mcp.ksrnyx.top/mcp`
> - **Local Stdio (`npx`)**: `npx -y luogu-mcp-server` *(Recommended — runs over your local IP to avoid cloud datacenter egress rate-limiting)*

**Chinese (`README.zh-CN.md`)**:
> **洛谷 MCP Server — 把洛谷题库、官方/精选题单与 100 个算法专题装进 Cursor / VS Code / Claude**
>
> 面向 OI 竞赛生、ACM 集训队员与 AI 编程助教的 **11 工具洛谷深度教研增强版 MCP Server**。零配置读题面、拉样例、查官方与精选用户题单，内置 **100 个算法专题中英别名扩展与模板题优先排序**（搜 `Treap` 自动召回 `平衡树` 并置顶 `【模板】普通平衡树`、搜 `SPFA` 自动联查 `最短路`）以及 **常见卡点靶向推题**。
>
> - **零安装公共 HTTP 接入**：`https://luogu-mcp.ksrnyx.top/mcp`
> - **本机 `npx` 直连（推荐，走本机宽带 IP 规避云端机房出口频控）**：`npx -y luogu-mcp-server`

---

### 1.2 "Which OJ MCP Repo & Endpoint Should I Use?" Matrix

Users across the portfolio encounter both `Kaiserunix/luogu-mcp-server` and `ketherworks/competitive-programming-mcp`. Place this disambiguation table near the top of both READMEs:

| Need / Use Case | Recommended Package / Repo | Protocol & Tool Surface | Canonical Hosted Endpoint | Local Command (`stdio`) |
| :--- | :--- | :--- | :--- | :--- |
| **Deep Luogu algorithm coaching**, 100-topic alias expansion (`luogu_find_topic_problems`), pain-point remediation (`luogu_recommend_problems`), training sets (`题单`), and public user profiles | **`Kaiserunix/luogu-mcp-server`** *(this repo)* | Luogu-native MCP v2 (**11 read-only tools**: `luogu_*`) | `https://luogu-mcp.ksrnyx.top/mcp` *(Health: `/health`)* | `npx -y luogu-mcp-server` |
| **Unified multi-OJ schema (`oj.*/v1`)** across **Codeforces, AtCoder, Luogu, NowCoder** (with local human-confirmed submission), and **LeetCode** | **`ketherworks/competitive-programming-mcp`** (`packages/luogu`) | Canonical `OJ v1` contract (**4 core tools**: `oj_capabilities`, `oj_health`, `oj_search_problems`, `oj_fetch_problem`) | `https://api.ksrnyx.top/oj-mcp/luogu/mcp` | `node packages/luogu/dist/index.js` |

> [!WARNING]
> **Deprecated Endpoint Notice**: Do **not** use `https://luogu-mcp-server.lantangtang54.workers.dev/mcp`. Direct Cloudflare Workers `.workers.dev` egress to `www.luogu.com.cn` is subject to upstream datacenter IP blocking. Always use `https://luogu-mcp.ksrnyx.top/mcp`, `https://api.ksrnyx.top/oj-mcp/luogu/mcp`, or local `npx -y luogu-mcp-server`.

---

## 2. First 60-Second Onboarding Copy (4-Client Copy-Paste Tabs)

Different MCP clients enforce incompatible JSON schemas (`.vscode/mcp.json` uses `"servers"` + `"type": "http"`, Claude Desktop requires stdio `"command"`, and Windows `npx` requires `cmd /c`). Provide explicit tabs so first-time users never hit config validation errors:

### Tab 1: Cursor / Windsurf / Cline (`~/.cursor/mcp.json`)

**Option A — Local `npx` Stdio (Recommended for daily coding, requires Node.js $\ge 20$)**:
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

**Option B — Zero-Install Hosted HTTP (Works without Node.js)**:
```json
{
  "mcpServers": {
    "luogu": {
      "url": "https://luogu-mcp.ksrnyx.top/mcp"
    }
  }
}
```

### Tab 2: VS Code / GitHub Copilot Agent (`.vscode/mcp.json`)

> [!IMPORTANT]
> VS Code uses top-level `"servers"` (not `"mcpServers"`) and requires `"type": "http"` for remote endpoints.

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

### Tab 3: Claude Desktop (`claude_desktop_config.json`)

> [!TIP]
> On Windows (`%APPDATA%\Claude\claude_desktop_config.json`), wrap `npx` with `cmd /c` to avoid `spawn npx ENOENT`.

**Windows**:
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

**macOS / Linux (`~/Library/Application Support/Claude/claude_desktop_config.json`)**:
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

### Tab 4: 3-Second Health Verification & First 3 Prompts

Verify the hosted server is reachable:
```bash
curl -s https://luogu-mcp.ksrnyx.top/health
```

Then copy-paste any of these 3 prompts into your AI chat:
1. **Read Problem + Samples (`luogu_fetch_problem` / `luogu_resolve_problem`)**:
   > *"获取洛谷 P1305（新二叉树）的题面、输入输出格式和第 1 组样例，先不要直接给完整代码，帮我分析一下输入终止条件。"*
2. **100-Topic Alias Expansion + Template Prioritization (`luogu_find_topic_problems`)**:
   > *"用 `luogu_find_topic_problems` 找 3 道 `Treap` 平衡树练习题（排除我已经做过的 `P3369`），并告诉我每道题匹配的搜索词和难度。"*
3. **Pain-Point Remediation + Official Training Sets (`luogu_find_related_problems` + `luogu_search_problem_sets`)**:
   > *"我做二叉树题时总是搞混先序、中序、后序遍历顺序（`topic: binary_tree`, `painPoint: traversal_order_confusion`），帮我推荐 4 道针对性练习题，并查一下洛谷官方的二叉树题单。"*

---

## 3. Disambiguated MCP Tool Descriptions (`src/server.ts` Drop-In Copy)

Use these upgraded `description` strings in `src/server.ts` so LLM agents deterministically choose between the 4 discovery tools and 2 fetch tools:

| Tool Name | Current Description Problem | Upgraded LLM-First Description (Drop-in for `src/server.ts`) |
| :--- | :--- | :--- |
| `luogu_find_topic_problems` | Doesn't tell the LLM to prefer it over `luogu_search_problems` and `luogu_recommend_problems` for general topics. | **"PRIMARY 100-TOPIC SEARCH: Find Luogu practice problems for an algorithm topic (100+ built-in topics). Automatically expands English/shorthand aliases to Chinese Luogu queries (e.g., 'SPFA' -> '最短路', 'Prim' -> '最小生成树', 'Treap' -> '平衡树', '状压' -> '状态压缩'), applies known tag IDs, prioritizes '【模板】' template problems and difficulties 1..5, and deduplicates results. Prefer this tool whenever searching by algorithm topic."** |
| `luogu_find_related_problems` | Doesn't explain the 3-stage waterfall or that `currentProblemId` excludes the active problem. | **"HYBRID COACHING RECOMMENDER: Find related follow-up practice problems via a 3-stage waterfall: (1) curated pain-point seed problems, (2) 100-topic alias-expanded live search, and (3) free-text keyword fallback. Pass `currentProblemId` (e.g., 'P1305') so the problem the student just solved is excluded."** |
| `luogu_recommend_problems` | Sounds like a universal recommender, causing LLMs to call it on any topic and get `items: []` for 94% of topics. | **"OFFLINE 6-BUCKET SEED RECOMMENDER: Instant, zero-network lookup returning curated seed problems and Chinese `searchHints` ONLY for 6 foundational beginner buckets: (1) `binary_tree` / `traversal_order_confusion`, (2) `tree_distance` / `weighted_cost`, (3) `recursion_base_case` / `depth_definition`, (4) `output_order` / `sentinel_input`, (5) `output_format`, (6) `matrix` / `simulation`. Returns `items: []` for other topics—call `luogu_find_topic_problems` or `luogu_find_related_problems` for general topics."** |
| `luogu_search_problems` | Doesn't mention that it only queries `type=P` without alias expansion. | **"RAW KEYWORD SEARCH: Search Luogu's main problem bank (type=P) by exact Chinese keyword or title fragment, with optional numeric `tagIds`. Use `luogu_find_topic_problems` instead if searching by algorithm concept or English alias."** |
| `luogu_fetch_problem` | Doesn't highlight that it supports all problem prefixes (`P`, `B`, `CF`, `AT`, etc.). | **"DIRECT PROBLEM FETCH: Fetch full problem statement, input/output formats, samples, difficulty (0-7), tags, and URL by exact Luogu problem ID (`pid`, such as 'P1305' or beginner-bank 'B2002'). Use `maxStatementChars` (default 5000, max 30000) to control context length."** |
| `luogu_resolve_problem` | Doesn't warn that non-`P` IDs currently require `luogu_fetch_problem`. | **"URL / ID / TITLE RESOLVER: Resolve a pasted Luogu problem URL (`https://www.luogu.com.cn/problem/P1305`), problem ID, or Chinese title fragment and fetch the full problem in one call. If you already have an exact non-P problem ID (such as `B2002` or `B3642`), call `luogu_fetch_problem` directly."** |

---

## 4. Human-Centered Error, Auth & Empty-State Microcopy Catalog

| Location (`file:line`) | Current Copy / Error | Problem in Real Usage | Proposed Human & Actionable Rewrite (Bilingual / Code-Ready) |
| :--- | :--- | :--- | :--- |
| **`src/tools.ts:127`**<br>`resolveProblemTool` | `Error: No Luogu problem matched query: ${query}` | Fires when a student pastes a `B`-series problem URL (`.../problem/B2002`) from Official Training Set 100 because `extractProblemId` only matches `\bP\d+\b`. | `No Luogu main-bank (P-series) problem matched "${query}". Tip: If "${query}" is a B-series (e.g. B2002) or remote-judge problem ID, call luogu_fetch_problem({ pid: "B2002" }) directly, or try a shorter Chinese title keyword.`<br>*(ZH: `未在洛谷主题库中找到匹配「${query}」的题目。提示：若输入的是入门与面试题库（如 B2002/B3642）或其他题号，请直接调用 luogu_fetch_problem(pid="${query}")，或尝试精简中文标题关键词。`)* |
| **`src/normalizers.ts:115`**<br>`normalizeProblemPayload` | `Error: Luogu response did not include a usable problem payload.` | Doesn't distinguish between a non-existent PID, a private contest problem, or a Luogu anti-bot HTML challenge. | `Luogu did not return a public problem payload for "${pid}". Possible causes: (1) Problem ID does not exist or belongs to a private team/contest; (2) Luogu challenged or rate-limited this server's IP—try running locally via "npx -y luogu-mcp-server".` |
| **`src/luoguClient.ts:122`**<br>`LuoguClient.getJson` | `Error: Luogu request failed: HTTP ${response.status} for ${url}` | Gives zero guidance when Cloudflare Worker egress hits HTTP `403`/`429`/`503`. | `Luogu request failed (HTTP ${response.status} for ${url}). If HTTP 403/429/503 persists on a hosted/Worker endpoint, Luogu may be rate-limiting datacenter egress—switch your MCP client to local stdio ("npx -y luogu-mcp-server").` |
| **`src/worker.ts:74-75`**<br>`validateOrigin` (`403`) | `{"error": "Origin is not allowed.", "hint": "Set LUOGU_MCP_ALLOWED_ORIGINS to a comma-separated list of browser origins if you need browser access."}` | End-users testing `luogu-mcp.ksrnyx.top/mcp` in a browser MCP Inspector think the server is broken or that they need to set an env var. | `{"error": "Browser cross-origin requests are disabled by default on this endpoint.", "hint": "Connect to /mcp from a desktop MCP client (Cursor, VS Code, Claude Desktop) or CLI (npx @modelcontextprotocol/inspector). Self-hosters: set LUOGU_MCP_ALLOWED_ORIGINS to allow browser origins."}` |
| **`src/worker.ts:94`**<br>`validateToken` (`401`) | `{"error": "Unauthorized"}` | Doesn't state which header formats are accepted. | `{"error": "Unauthorized: missing or invalid access token.", "hint": "Send 'Authorization: Bearer <LUOGU_MCP_TOKEN>' or 'X-Luogu-Mcp-Token: <LUOGU_MCP_TOKEN>' in your MCP client headers."}` |
| **`README.md` (pre-consolidation)**<br>`smoke:mimo` note | Previously referenced a developer-specific local Windows path (`C:\Users\<user>\.continue\.env`). | Leaked a local Windows username path instead of using `~`. *(Fixed in `README.md` on this PR.)* | `` `smoke:mimo` reads `MIMO_API_KEY` from the environment (or from `~/.continue/.env` if present locally). `` |
