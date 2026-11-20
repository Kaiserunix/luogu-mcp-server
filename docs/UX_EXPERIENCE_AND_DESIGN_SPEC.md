# UX Experience & Product Design Specification: Luogu MCP Server (`Kaiserunix/luogu-mcp-server`)

> **Repository**: `Kaiserunix/luogu-mcp-server` (`v0.2.1`, MCP Registry: `io.github.Kaiserunix/luogu-mcp-server`)
> **Branch**: `swarm/ux-design-4`
> **Authors**: `@design-copy-4` (Product Designer & UX Copywriter) × `@ux-sim-4` (Simulated OI/ACM End-User & Experience Tester)
> **Code-Truth Baseline**: Verified line-by-line against `src/server.ts`, `src/tools.ts`, `src/luoguClient.ts`, `src/normalizers.ts`, `src/recommendations.ts`, `src/topicCatalog.ts`, `src/topicSearch.ts`, `src/types.ts`, `src/worker.ts`, `src/index.ts`, `scripts/*.mjs`, `README.md`, `README.zh-CN.md`, and `docs/cloudflare-deployment.md`.

---

## 1. Executive Summary & Product Identity Alignment

`Kaiserunix/luogu-mcp-server` is much more than a thin HTTP scraper for Luogu (`www.luogu.com.cn`). Under the hood, it ships an opinionated **11-tool AI algorithm coaching & discovery engine** built on `@modelcontextprotocol/server@2.0.0`, featuring:
1. **A 100-Topic Bilingual Algorithm Catalog (`src/topicCatalog.ts`)** with English/shorthand alias expansion (`SPFA` → `["SPFA", "最短路"]`, `Treap` → `["Treap", "平衡树"]`, `Prim` → `["Prim", "最小生成树"]`) and a **Pedagogical Ranking Scorer (`src/topicSearch.ts:63-86`)** that boosts `【模板】` problems (`+30`) and playable difficulties `1..5` (`+5`) while penalizing NOI-tier monster problems `>=6` (`-4`).
2. **A Hybrid Official + Community Training Set (`题单`) Aggregator (`src/tools.ts:133-154`)** that works around Luogu's broken official training-list search by querying `type=official` and `type=select` in parallel, filtering, and deduplicating results.
3. **A Resilient Multi-Schema Lentille JSON Normalizer (`src/normalizers.ts:110-134`)** that handles Luogu's drifting `x-lentille-request: content-only` payloads (`problem.description`, `problem.content.*`, and French-keyed `problem.contenu.*`) with context-safe statement truncation (`maxStatementChars`).

### The Core UX Challenge
Despite these high-value pedagogical internals, first-time users (high-school OIers, college ACM-ICPC trainees, and AI agent developers) hit **six critical experience gaps**:
1. **Ecosystem & Endpoint Split-Brain**: Confusion between `Kaiserunix/luogu-mcp-server` (11 `luogu_*` coaching tools at `https://luogu-mcp.ksrnyx.top/mcp`), `ketherworks/competitive-programming-mcp` (4 canonical `oj_*` contract tools at `https://api.ksrnyx.top/oj-mcp/luogu/mcp`), and dead/blocked Cloudflare Workers `.workers.dev` URLs.
2. **First-60-Second Client Config Rejections**: Bare `mcpServers` JSON snippets in `README.md` lack file paths and fail directly in VS Code Copilot (`.vscode/mcp.json` requires `"servers"` + `"type": "http"`), Claude Desktop (`"url"` unsupported without `mcp-remote`), and Windows `npx` (`spawn npx ENOENT` without `cmd /c`).
3. **All-Bank Problem ID Blindness (`B` / `CF` / `AT` / `SP` / `UVA`)**: `luogu_resolve_problem` uses regex `/\bP\d+\b/i` (`src/tools.ts:366`) and `luogu_search_problems` hardcodes `type: "P"` (`src/luoguClient.ts:44`), causing official beginner training-set problems like `B2002` or `B3642` to fail resolution with `"No Luogu problem matched query"`.
4. **LLM Tool-Routing Confusion Among 4 Discovery Tools**: Overlapping descriptions for `luogu_recommend_problems` (static 6-bucket / 13-problem seed dictionary), `luogu_find_topic_problems` (live 100-topic engine), `luogu_find_related_problems` (3-stage hybrid waterfall), and `luogu_search_problems` (raw `type=P` search) cause LLMs to call `luogu_recommend_problems` on general topics and receive empty `items: []` 94% of the time.
5. **Opaque Numeric Metadata & Missing Execution Constraints**: Tool outputs expose raw integers (`difficulty: 2`, `tags: ["72", "93"]`) without Chinese OI difficulty colors/names (`普及− / 橙题`) or semantic tag strings, and drop `timeLimit` / `memoryLimit` from Luogu's payload.
6. **Silent Edge-Case Traps in `src/tools.ts` & `src/luoguClient.ts`**:
   - Passing `pid: "P1305"` (without `currentProblemId`) to `luogu_find_related_problems` fails to exclude `P1305` and can recommend `P1305` back to the solver (`src/tools.ts:62, 198, 212`).
   - Client-side `filterProblemSetSearchResults` enforces literal title substring matching even on `type: "select"` and alias queries (`src/tools.ts:145, 344-351`), wiping out training sets titled `"【动态规划】..."` when a student searches `"DP"`.
   - `LuoguClient.getJson` (`src/luoguClient.ts:112`) has no `AbortSignal.timeout()`, hanging indefinitely when Luogu throttles datacenter egress IPs.

---

## 2. End-to-End Simulated User Personas & Journey Map (`@ux-sim-4` × `@design-copy-4`)

| Persona | Profile & Environment | Primary Goal | Real Friction Encountered in `v0.2.1` | Target vNext Experience |
| :--- | :--- | :--- | :--- | :--- |
| **Persona 1: 小林 (Xiaolin)**<br>16yo High-School CSP-J/S & NOIP OIer | Windows school computer lab (no Admin rights, Node 16 or no Node installed); uses **VS Code Copilot Agent / Cline** via **Hosted Streamable HTTP**. | Practice Luogu Official Training Sets (`【入门1】顺序结构` id `100`, `二叉树` id `114`), read statements/samples, and get non-spoiler hints. | 1. Pasted README `mcpServers` JSON into `.vscode/mcp.json` → schema rejected (`VS Code` requires `"servers"` + `"type": "http"`).<br>2. Fetched Training Set `100`, saw beginner problem `B2002`, asked AI to resolve `https://www.luogu.com.cn/problem/B2002` → `luogu_resolve_problem` threw `Error: No Luogu problem matched query`. | Copy-pastes the VS Code tab config in 10s; resolves any `P`/`B`/`CF`/`AT`/`UVA`/`SP` URL or ID seamlessly; sees `难度：入门 (红题) · 1000ms / 128MB`. |
| **Persona 2: 阿杰 (Ajie)**<br>19yo College ACM-ICPC Regional Trainee | Personal Windows/macOS laptop; uses **Cursor** + local **`npx -y luogu-mcp-server`** alongside a local C++17 workspace. | Drill 100 algorithm topics (`Treap`, `SPFA`, `区间DP`, `网络流`), scaffold local `.cpp` + sample I/O runners, and upsolve after WA/TLE. | 1. Asked for `"动态规划"` recommendations → LLM picked `luogu_recommend_problems` (only 6 static beginner buckets) and got `items: []`.<br>2. Searched training sets for `"DP"` → client-side filter required literal `"dp"` in title, dropping Chinese `"【动态规划】"` sets.<br>3. Raw `tags: ["72", "93"]` gave zero clue which sub-algorithms a problem tested. | LLM deterministically routes to `luogu_find_topic_problems`; invokes `/luogu-coach P3369` or `/luogu-scaffold P1305` prompt templates to generate local test harnesses. |
| **Persona 3: 陈学长 (Senior Chen)**<br>22yo ICPC Medalist & Club Coach | macOS + Cloudflare account; uses **Claude Desktop** + **MCP Inspector** to curate weekly club training sets and self-host an endpoint. | Curate official + selected problem sets (`type: "all"`), inspect member public profiles (`luogu_get_user_profile`), and deploy a private club MCP server. | 1. Pasted `"url": "https://luogu-mcp.ksrnyx.top/mcp"` into `claude_desktop_config.json` → Claude Desktop crashed (requires stdio `npx` or `mcp-remote`).<br>2. Opened Web MCP Inspector against `/mcp` → blocked by `403 Origin is not allowed` with an operator-only hint.<br>3. Deployed to Cloudflare Workers per `docs/cloudflare-deployment.md` → hit Luogu egress IP blocks (`403`/`503`) with no timeout or Node fallback guide. | Uses ready-made Claude Desktop config; understands `passedProblemCount: null` privacy and `luogu_get_capabilities` auth boundaries; deploys with honest egress guidance. |

---

## 3. Code-Truth UX Audit: 8 Friction Points & Technical Root Causes

### 3.1 Friction #1: Ecosystem Split-Brain & Hosted Endpoint Contradictions (P0 Trust Blocker)
- **Code Evidence**:
  - `Kaiserunix/luogu-mcp-server/README.md:15,62` & `server.json:14` advertise `https://luogu-mcp.ksrnyx.top/mcp` (11 tools, `luogu_*` namespace).
  - `ketherworks/competitive-programming-mcp/README.md:38` advertised `https://luogu-mcp-server.lantangtang54.workers.dev/mcp`, while its `docs/deployment/production-endpoints.md:11,17-19` states that **AtCoder & Luogu Cloudflare Workers were removed due to upstream egress blocking** and migrated to `https://api.ksrnyx.top/oj-mcp/luogu/mcp` (4 tools, `oj_*` canonical v1 contract).
  - Meanwhile, `Kaiserunix/luogu-mcp-server/docs/cloudflare-deployment.md:12` still tells users: *"For this workload, Cloudflare Workers is the default public deployment target."*
  - `Kaiserunix/luogu-mcp-server/README.md:261` leaks a hardcoded author machine path: `C:\Users\qwerf\.continue\.env`.
- **UX Impact**: Users and downstream integrations (`student-autocomplete-lab`) do not know which repo, tool namespace, or hosted URL is canonical, and self-hosters who follow `docs/cloudflare-deployment.md` hit unexpected Luogu datacenter IP blocks.

### 3.2 Friction #2: Per-Client MCP Configuration Schema Mismatches
- **Code Evidence**: `README.md:11-32` and `README.zh-CN.md:11-32` provide only two bare JSON blocks (`"url"` and `"command": "npx"`) without specifying target config file paths or client-specific schema rules.
- **UX Impact**:
  - **VS Code (`.vscode/mcp.json`)**: Rejects `"mcpServers"`; requires top-level `"servers"` and explicit `"type": "http"` or `"type": "stdio"`.
  - **Claude Desktop (`claude_desktop_config.json`)**: Rejects `"url"` inside `"mcpServers"` (only supports `"command"` stdio servers unless bridged via `npx -y mcp-remote <url>`).
  - **Windows Stdio (`spawn npx ENOENT`)**: Spawning `npx` directly in Node child processes on Windows fails in several MCP clients unless invoked via `"command": "cmd", "args": ["/c", "npx", "-y", "luogu-mcp-server"]`.
  - **Node `<20` Failure (`package.json:60`, `src/index.ts:9-12`)**: Fails with raw `luogu-mcp-server failed: ...` on school/lab machines running Node 16/18 without advising the user to use the zero-install HTTP endpoint (`https://luogu-mcp.ksrnyx.top/mcp`).

### 3.3 Friction #3: `B`-Prefix & Remote-Judge Blindness in `luogu_resolve_problem` and `luogu_search_problems`
- **Code Evidence**:
  - `src/tools.ts:365-368`:
    ```ts
    function extractProblemId(query: string): string | undefined {
      const match = query.match(/\bP\d+\b/i) ?? query.match(/luogu\.com\.cn\/problem\/(P\d+)/i);
      return match?.[1]?.toUpperCase() ?? match?.[0]?.toUpperCase();
    }
    ```
  - `src/luoguClient.ts:43-46`:
    ```ts
    const params = new URLSearchParams({
      type: "P",
      keyword
    });
    ```
- **UX Impact**:
  - Luogu hosts multiple problem banks: **`P`** (主题库, e.g. `P1001`), **`B`** (入门与面试, e.g. `B2002`, `B3642`), **`CF`** (Codeforces, e.g. `CF1A`), **`AT`** (AtCoder, e.g. `AT_dp_a`), **`SP`** (SPOJ), **`UVA`** (UVa), and **`T`/`U`** (团队/个人题).
  - Even Luogu's Official Training Set `100` (`【入门1】顺序结构`) and `test/tools.test.ts:214` (`B3642 二叉树的遍历`) include `B`-series problems!
  - If a student passes `"B2002"` or `"https://www.luogu.com.cn/problem/B2002"` to `luogu_resolve_problem`, `extractProblemId()` returns `undefined`, falls back to `searchProblemsTool({ keyword: "https://...", limit: 1 })` (which forces `type=P`), finds nothing, and throws `Error: No Luogu problem matched query: https://www.luogu.com.cn/problem/B2002`—even though `luogu_fetch_problem({ pid: "B2002" })` succeeds!

### 3.4 Friction #4: Ambiguous 4-Tool Discovery Hierarchy & Static 6-Bucket Surprise
- **Code Evidence**:
  - `src/recommendations.ts:23-55` defines only **13 static seed problems across 6 beginner buckets**:
    1. `binary_tree` / `traversal_order_confusion` (`P1305`, `P1030`, `P1827`, `P1229`)
    2. `tree_distance` / `weighted_cost` (`P1364`, `P3884`, `P4913`)
    3. `recursion_base_case` / `depth_definition` / `child_indexing` (`P4913`, `P1305`, `P1030`)
    4. `output_order` / `sentinel_input` (`P1427`, `P5727`, `P5731`)
    5. `output_format` / `format` (`P5731`, `P5730`, `P1185`)
    6. `matrix` / `simulation` (`P1205`, `P5731`, `P5730`)
  - Yet in `src/server.ts:291-327`, `luogu_recommend_problems` is described generically as: *"Recommend seed Luogu problems from a topic or student pain point, with search hints for further exploration."*
- **UX Impact**: When an AI agent calls `luogu_recommend_problems({ topic: "动态规划" })` or `luogu_recommend_problems({ topic: "Treap" })`, `findBucket()` returns `undefined` and `items` is **`[]` (empty array)**! The agent assumes Luogu has no recommendations, instead of calling `luogu_find_topic_problems` (100-topic catalog) or `luogu_find_related_problems` (which chains `recommendProblems` → `findTopicProblemsTool` → `searchProblemsTool`).

### 3.5 Friction #5: Self-Recommendation Bug in `luogu_find_related_problems` (`pid` vs `currentProblemId`)
- **Code Evidence**:
  - `src/server.ts:140-161` exposes **both** `pid` (*"Current Luogu problem id, used for context and exclusion in future versions"*) and `currentProblemId` (*"Exclude this current Luogu problem id"*).
  - In `src/tools.ts:198`, `excludeProblemIds` only includes `input.currentProblemId` (ignoring `input.pid`).
  - Worse, in `src/tools.ts:212-224`:
    ```ts
    const searchQuery = input.query ?? hints[0] ?? input.pid;
    if (items.length < limit && searchQuery) {
      const search = await searchProblemsTool({ keyword: searchQuery, limit }, fetchImpl);
      ...
    ```
- **UX Impact**: If an LLM calls `luogu_find_related_problems({ pid: "P1305" })` expecting problems related to `P1305`, `searchQuery` becomes `"P1305"`, it searches Luogu for `"P1305"`, and returns **`P1305` itself** as the top "related" problem!

### 3.6 Friction #6: Over-Aggressive Client-Side Substring Filtering in `luogu_search_problem_sets`
- **Code Evidence**:
  - `src/tools.ts:139-146` and `src/tools.ts:344-351`:
    ```ts
    function filterProblemSetSearchResults(keyword: string, search: SearchResults<ProblemSetSummary>): SearchResults<ProblemSetSummary> {
      const normalizedKeyword = normalizeSearchText(keyword);
      const items = search.items.filter((item) => normalizeSearchText(item.title).includes(normalizedKeyword));
      return { total: items.length, items };
    }
    ```
- **UX Impact**:
  1. For `type: "select"`, Luogu's backend (`/training/list?type=select&keyword=...`) already performs server-side search. Running `filterProblemSetSearchResults` on `type: "select"` discards valid training sets whose title uses a synonym (e.g., searching `"最短路"` drops a selected set titled `"Dijkstra 与 SPFA 专项"`).
  2. When searching by English alias (e.g., `"DP"`, `"MST"`, `"Treap"`), `searchProblemSetsTool` does not expand aliases via `topicQueriesFor(keyword)` from `src/topicCatalog.ts`, so `"DP"` misses official training sets titled `"【动态规划1】动态规划的引入"`.

### 3.7 Friction #7: Opaque Magic Numbers (`difficulty: 2`, `tags: ["72"]`) & Missing Time/Memory Limits
- **Code Evidence**:
  - `src/normalizers.ts:123-124, 157-158, 307-309`: `difficulty` is emitted as a raw number (`0..7`), and `tags` is emitted as an array of stringified numbers (`["72", "11"]`).
  - `src/types.ts:6-18` (`ProblemRecord`): omits `timeLimit` and `memoryLimit` (available in Luogu's `data.problem.limits.time` and `data.problem.limits.memory`).
  - `src/tools.ts:108, 357-363`: `trimText(problem.statement, maxStatementChars)` slices raw characters without reporting `originalStatementChars` or avoiding mid-LaTeX cuts.
- **UX Impact**:
  - LLMs misinterpret `difficulty: 2` as "2/5" or "Medium", whereas in Luogu `2` is **`普及−` (Orange / Elementary-)** on a 0–7 scale.
  - Stringified numeric tags like `["72", "353"]` are meaningless to both the LLM and the student unless mapped to human names.
  - Without time/memory limits (`1.00s / 125MB`), an AI coding coach cannot tell whether an $O(n^2)$ solution will TLE unless the student manually copies the limits from the browser.

### 3.8 Friction #8: Unhelpful Error Messages & Missing Upstream Fetch Timeout
- **Code Evidence**:
  - `src/luoguClient.ts:108-142`: `fetchImpl(url, ...)` has no `AbortSignal.timeout(8000)`.
  - `src/normalizers.ts:115`: throws generic `"Luogu response did not include a usable problem payload."` regardless of whether the PID does not exist, is contest-locked, or returned an anti-bot HTML challenge.
  - `src/worker.ts:72-78`: returns `403 {"error": "Origin is not allowed.", "hint": "Set LUOGU_MCP_ALLOWED_ORIGINS..."}` when a student opens the public URL in a browser-based MCP Inspector, blaming the user for an operator env var.

---

## 4. Hidden Gems That Deserve Headline Placement

Our code audit confirmed four standout engineering & pedagogical features that are currently buried in source files or bottom-of-README notes:

```mermaid
flowchart LR
    A["Student / AI Agent Query<br/>e.g. 'Treap', 'SPFA', 'traversal_order_confusion'"] --> B{"Tool Router"}
    B -->|"luogu_find_topic_problems"| C["100-Topic Bilingual Catalog<br/>src/topicCatalog.ts"]
    C --> D["Alias & Tag Expansion<br/>Treap -> ['Treap', '平衡树']<br/>二叉树 -> tagIds: [11]"]
    D --> E["Pedagogical Scorer<br/>src/topicSearch.ts<br/>+30 【模板】 | +25 普通平衡树<br/>+5 diff 1..5 | -4 diff >=6"]
    B -->|"luogu_search_problem_sets"| F["Dual-Endpoint Training Aggregator<br/>src/tools.ts<br/>type=official + type=select merged"]
    B -->|"luogu_fetch_problem"| G["3-Schema Lentille Normalizer<br/>src/normalizers.ts<br/>content / contenu / description"]
```

1. **100-Topic Bilingual Alias & Pedagogical Template Scorer (`src/topicCatalog.ts` + `src/topicSearch.ts:63-86`)**:
   - Confirmed $\ge 98/100$ topic hit rate (`scripts/topic-coverage-smoke.mjs`).
   - Not only bridges English CS terms (`SPFA`, `Prim`, `Kruskal`, `Treap`, `Splay`, `LCA`, `FFT`, `NTT`, `2-SAT`, `CDQ`) to Chinese Luogu queries, but actively ranks **`【模板】` (Template)** problems and **difficulty `1..5` (`入门` to `提高+/省选−`)** above esoteric `NOI/CTSC` (`>=6`) problems so students get playable practice first.
2. **Parallel Official + Community Training Set (`题单`) Merger (`src/tools.ts:133-154`)**:
   - Transparently combines Luogu's official curriculum index (`type="official"`, e.g. `100` 顺序结构, `114` 二叉树, `211` 动态规划) with community-curated problem sets (`type="select"`, e.g. `1060`, `1230`).
3. **3-Generation Luogu Lentille Schema Normalizer (`src/normalizers.ts:24-37, 110-134`)**:
   - Seamlessly normalizes legacy `problem.description`, modern `problem.content.{background,description,formatI,formatO}`, and French-keyed `problem.contenu.{...}` responses while keeping payloads compact via `maxStatementChars`.
4. **Offline 100-Topic Markdown Problem Pack Exporter (`scripts/download-topic-problems.mjs`)**:
   - One command (`npm run download:topics`) crawls 1 representative problem across all 100 algorithm topics through real stdio MCP and generates a local folder of clean Markdown problem cards (`Pxxxx-Title.md` + `manifest.json`) with formatted sample I/O blocks.

---

## 5. vNext UX & Product Design Blueprints

### 5.1 Blueprint 1: 60-Second Multi-Client Onboarding Cards (Copy-Paste Ready)

Replace the single ambiguous `mcpServers` block in `README.md` / `README.zh-CN.md` with explicit per-client cards and a 3-second verification step:

| Client / Host | Config File Path | Transport Recommendation | Exact Copy-Paste JSON Snippet |
| :--- | :--- | :--- | :--- |
| **Cursor / Windsurf / Cline** | `~/.cursor/mcp.json` | Local `npx` *(recommended, uses residential IP)* or Hosted HTTP | `{"mcpServers": {"luogu": {"command": "npx", "args": ["-y", "luogu-mcp-server"]}}}`<br>*(Or `"url": "https://luogu-mcp.ksrnyx.top/mcp"`)* |
| **VS Code (GitHub Copilot Agent)** | `.vscode/mcp.json` *(workspace)* or User Settings | Hosted Streamable HTTP (`"servers"` + `"type": "http"`) | `{"servers": {"luogu": {"type": "http", "url": "https://luogu-mcp.ksrnyx.top/mcp"}}}` |
| **Claude Desktop (macOS / Linux)** | `~/Library/Application Support/Claude/claude_desktop_config.json` | Local `npx` stdio *(Claude Desktop requires stdio)* | `{"mcpServers": {"luogu": {"command": "npx", "args": ["-y", "luogu-mcp-server"]}}}` |
| **Claude Desktop (Windows)** | `%APPDATA%\Claude\claude_desktop_config.json` | Local `cmd /c npx` wrapper *(prevents `spawn npx ENOENT`)* | `{"mcpServers": {"luogu": {"command": "cmd", "args": ["/c", "npx", "-y", "luogu-mcp-server"]}}}` |

**3-Second Health Check & First Prompt Checklist**:
- [ ] **Step 1 (Verify Endpoint)**: Open `https://luogu-mcp.ksrnyx.top/health` in your browser (or run `curl -s https://luogu-mcp.ksrnyx.top/health`) and confirm `"name": "luogu-mcp-server"` and all 11 tools are listed.
- [ ] **Step 2 (Test Problem Fetch)**: Ask your AI: *"Fetch Luogu P1305 with its statement and Sample 1."*
- [ ] **Step 3 (Test 100-Topic Alias Engine)**: Ask your AI: *"Use `luogu_find_topic_problems` to find 3 `Treap` practice problems excluding `P3369`."*

---

### 5.2 Blueprint 2: Deterministic 11-Tool Decision Matrix (For AI Agents & Developers)

Present the 11 tools grouped by **User Intent** rather than a flat alphabetical list, so both human developers and LLM tool routers pick the right tool on the first call:

| Intent Category | Tool Name | Network / Data Source | When to Call (Routing Rule) | Key Input Parameters |
| :--- | :--- | :--- | :--- | :--- |
| **1. Topic & Coaching Discovery**<br>*(Start Here for Practice)* | **`luogu_find_topic_problems`** ⭐ | Live Luogu + 100-Topic Alias Catalog + Template Scorer | **Primary choice** whenever searching by algorithm concept (`"Treap"`, `"SPFA"`, `"区间DP"`, `"网络流"`). | `topic` (req), `limit` (1–30), `excludeProblemIds` |
| | **`luogu_find_related_problems`** ⭐ | 3-Stage Hybrid: Static Seeds → 100-Topic Live → Keyword Fallback | When a student finishes or gets stuck on a problem and needs follow-up practice for a specific `topic` or `painPoint`. | `topic`, `painPoint`, `query`, `currentProblemId`, `limit` (1–20) |
| | `luogu_list_algorithm_topics` | Offline Catalog (`100` topics) | Inspect supported canonical topic names, English aliases, and known Luogu `tagIds`. | *(none)* |
| | `luogu_recommend_problems` | Offline Seed Table (`6` beginner buckets, `13` problems) | Instant zero-network lookup **only** for the 6 foundational beginner pain-point buckets (`binary_tree`, `tree_distance`, `recursion`, `output_order`, `output_format`, `matrix`). | `topic`, `painPoint`, `currentProblemId`, `limit` (1–10) |
| **2. Direct Problem Reading** | **`luogu_fetch_problem`** ⭐ | Live Luogu `/problem/{pid}` | When you already know the exact problem ID (`P1305`, `B2002`, `CF1A`, `AT_dp_a`). | `pid` (req), `maxStatementChars` (200–30000, default 5000) |
| | `luogu_resolve_problem` | Regex ID Extractor → Fallback Live Search → Fetch | When the user pastes a full `luogu.com.cn/problem/...` URL, raw ID, or exact problem title fragment. | `query` (req), `maxStatementChars` |
| | `luogu_search_problems` | Live Luogu `/problem/list?type=P` | Raw keyword or numeric `tagIds` search across Luogu's main `P` bank when searching by partial problem title. | `keyword` (req), `page`, `limit` (1–30), `tagIds` |
| **3. Official & Community Training Sets (`题单`)** | **`luogu_search_problem_sets`** ⭐ | Live Luogu `/training/list` (`official` + `select`) | Discover structured multi-problem curricula (e.g., `"入门"`, `"二叉树"`, `"动态规划"`, `"网络流"`). | `keyword` (req), `type` (`"all"` \| `"official"` \| `"select"`), `page`, `limit` |
| | `luogu_fetch_problem_set` | Live Luogu `/training/{id}` | Fetch the full problem roster (up to 500 problems) of a training set by `id` (e.g. `"100"`, `"114"`, `"211"`). | `id` (req), `limit` (1–500, default 100) |
| **4. Profile & Route Metadata** | `luogu_get_user_profile` | Live Luogu `/user/{uid}` | Fetch public user profile (`name`, `ranking`, `guRating`, `followerCount`, `passedProblemCount`) by numeric `uid`. | `uid` (req, positive int) |
| | `luogu_get_capabilities` | Offline Capability Matrix | Check which Luogu routes are `available` (public read), `auth_required` (submissions/solutions/discussions), or `planned`. | *(none)* |

---

### 5.3 Blueprint 3: OI-Native Output Enrichment Wireframe (`ProblemRecord` & `ProblemSummary`)

To eliminate opaque magic numbers (`difficulty: 2`, `tags: ["72"]`) and silent context truncation, enrich the normalized tool payload (backward-compatible additions to `src/types.ts` and `src/normalizers.ts`):

#### Before vs. After JSON Payload Wireframe (`luogu_fetch_problem({ pid: "P1305" })`)

| Field Group | Current `v0.2.1` Payload (`src/normalizers.ts`) | vNext Enriched Payload Blueprint (Backward-Compatible) | UX & Agent Benefit |
| :--- | :--- | :--- | :--- |
| **Identity & Bank** | `"platform": "luogu", "id": "P1305", "title": "新二叉树"` | `"platform": "luogu", "id": "P1305", "bank": "P", "title": "新二叉树"` | Explicitly identifies problem bank (`P` / `B` / `CF` / `AT` / `SP` / `UVA`). |
| **Difficulty Tier** | `"difficulty": 2` | `"difficulty": 2,`<br>`"difficultyLabel": "普及−",`<br>`"difficultyColor": "orange"` | Gives Chinese OIers native `红/橙/黄/绿/蓝/紫/黑` tier labels and prevents LLM rating hallucinations. |
| **Execution Limits** | *(Omitted from `ProblemRecord`)* | `"timeLimitMs": 1000,`<br>`"memoryLimitKb": 128000,`<br>`"limitsSummary": "1.00s / 125.00MB"` | Enables AI coach to evaluate time/space complexity against $N$ constraints. |
| **Tags** | `"tags": ["72"]` | `"tags": ["72"],`<br>`"tagLabels": ["树形结构 / 二叉树"]` *(when known in catalog)* | Replaces opaque numeric strings with semantic algorithm labels where mapped. |
| **Truncation Metadata** | `"truncated": true` | `"truncated": true,`<br>`"statementChars": 5000,`<br>`"originalStatementChars": 7420,`<br>`"truncationNotice": "Statement truncated at 5000/7420 chars. Re-call with maxStatementChars: 8000 for full text."` | Tells the agent exact total length and how to fetch the remainder without guessing. |

#### Canonical Luogu Difficulty Mapping Table (0–7)

| `difficulty` Integer | Official Luogu Tier (`difficultyLabel`) | OI Community Color (`difficultyColor`) | Target Contest Equivalence |
| :---: | :--- | :--- | :--- |
| `0` | `暂无评定` (Unrated) | `gray` (灰题) | Unrated / Newly imported |
| `1` | `入门` (Beginner) | `red` (红题) | CSP-J T1 / Syntax basics |
| `2` | `普及−` (Elementary−) | `orange` (橙题) | CSP-J T2 / Basic simulation & greedy |
| `3` | `普及/提高−` (Elementary / Intermediate−) | `yellow` (黄题) | CSP-J T3–T4 / CSP-S T1 |
| `4` | `普及+/提高` (Intermediate) | `green` (绿题) | CSP-S T2 / NOIP standard |
| `5` | `提高+/省选−` (Advanced / Provincial−) | `blue` (蓝题) | CSP-S T3–T4 / NOIP hard / ICPC Regional Easy-Med |
| `6` | `省选/NOI−` (Provincial / NOI−) | `purple` (紫题) | Provincial Selection / NOI / ICPC Regional Med-Hard |
| `7` | `NOI/NOI+/CTSC` (Olympiad) | `black` (黑题) | NOI / IOI / ICPC World Finals |

---

### 5.4 Blueprint 4: 5 High-Leverage Code & UX Fixes for vNext (`src/tools.ts` & `src/luoguClient.ts`)

While this UX specification branch strictly touches only `docs/*`, we provide exact, ready-to-land specifications for the engineering team (`@dev-luogu-mcp`):

1. **All-Bank Problem ID Extraction in `extractProblemId` (`src/tools.ts:365-368`)**:
   - **Current**: `query.match(/\bP\d+\b/i) ?? query.match(/luogu\.com\.cn\/problem\/(P\d+)/i)`
   - **vNext Spec**: Match all public Luogu problem prefixes (`P`, `B`, `CF`, `AT_`, `SP`, `UVA`, `T`, `U`):
     ```ts
     const LUOGU_PID_REGEX = /\b((?:P|B|T|U)\d+|CF\d+[A-Z]\d*|AT_[A-Za-z0-9_]+|SP\d+|UVA\d+)\b/i;
     ```
     and normalize prefix casing (`P`/`B`/`CF`/`SP`/`UVA` uppercase, preserving AtCoder `AT_...` task slug case as required by Luogu URLs).
2. **Exclude Both `pid` and `currentProblemId` in `findRelatedProblemsTool` (`src/tools.ts:184-234`)**:
   - **vNext Spec**: Normalize `const excludedCurrentId = (input.currentProblemId ?? input.pid)?.trim().toUpperCase();` and filter it out across all 3 stages (static seeds, `findTopicProblemsTool`, and fallback `searchProblemsTool`) so a problem never recommends itself.
3. **Alias-Aware Training Set Filtering (`src/tools.ts:133-154, 344-351`)**:
   - **vNext Spec**:
     - For `type === "select"`, trust Luogu's server-side search results instead of wiping out non-substring matches with `filterProblemSetSearchResults`.
     - For `type === "official"` (where client-side filtering is needed because Luogu returns the unfiltered official index), expand `keyword` using `topicQueriesFor(keyword)` from `src/topicCatalog.ts` so searching `"DP"` matches `"动态规划"`, `"MST"` matches `"最小生成树"`, and `"Treap"` matches `"平衡树"`.
4. **Add `AbortSignal.timeout(8000)` to `LuoguClient.getJson` (`src/luoguClient.ts:112`)**:
   - **vNext Spec**: Pass `signal: AbortSignal.timeout(this.timeoutMs ?? 8000)` into `this.fetchImpl(url, ...)` so throttled upstream requests fail fast and retry deterministically (`RETRY_DELAYS_MS = [250, 750]`) instead of hanging the MCP client.
5. **Register 3 Built-In Socratic Coaching MCP Prompts (`prompts/list` in `src/server.ts`)**:
   - Expose 1-click slash commands in Cursor / Claude Desktop / VS Code:
     - `/luogu-coach <pid>`: Fetches problem & samples via `luogu_resolve_problem`, analyzes constraints, and provides a 3-tier Socratic hint ladder without spoiling full AC code.
     - `/luogu-scaffold <pid>`: Fetches problem & samples and generates a local C++/Python solution template + sample test runner script.
     - `/luogu-upsolve <topic_or_pain_point>`: Calls `luogu_find_related_problems` + `luogu_search_problem_sets` to build a 3-problem progressive remediation ladder (`入门/橙题` → `黄题` → `绿题`).

---

## 6. Deployment & Self-Hosting Honesty Guide (Cloudflare Workers vs. Local `npx` / Node Host)

To resolve the deployment confusion identified across `luogu-mcp-server` and `competitive-programming-mcp`:

| Deployment Mode | Best For | Upstream Luogu Reliability | Setup Effort | Key Security / Egress Note |
| :--- | :--- | :--- | :--- | :--- |
| **1. Local `npx -y luogu-mcp-server` (`stdio`)** | Individual students & developers on Cursor / Claude Desktop / VS Code | **Highest (99%+)** — requests originate from user's residential/campus IP | **10 seconds** (requires Node.js $\ge 20$) | Zero open ports; inherits local network access to `www.luogu.com.cn`. |
| **2. Canonical Hosted HTTP (`https://luogu-mcp.ksrnyx.top/mcp`)** | Zero-install onboarding, school lab PCs without Node 20, Web/HTTP MCP clients | **High** — routed through managed custom domain | **5 seconds** (paste URL) | Public read-only endpoint; browser `Origin` headers rejected by default (`403`) for CSRF/abuse protection. |
| **3. Self-Hosted Node 22 / Reverse Proxy** | Club coaches & teams running a shared server | **High** (when hosted on residential/CN-friendly egress IP) | **5 minutes** | Set `LUOGU_MCP_TOKEN` (`Authorization: Bearer <token>` or `X-Luogu-Mcp-Token`) for private club access. |
| **4. Self-Hosted Cloudflare Worker (`wrangler deploy`)** | Edge experimentation & custom Worker routes (`src/worker.ts`) | **Variable / Egress-Sensitive** — raw `.workers.dev` datacenter egress IPs may encounter Luogu HTTP `403`/`429`/`503` blocks | **3 minutes** (`npm run deploy:cf`) | Always run `npm run smoke:cf -- https://<your-worker-url>` AND verify a live `luogu_fetch_problem` call (`P1001`) post-deploy. |

---

## 7. Summary of Top 3 UX & Design Wins Delivered on `swarm/ux-design-4`

1. **Ecosystem & Client Onboarding Disambiguation**: Created a crystal-clear **"11-Tool Luogu Coaching Edition vs. 4-Tool `OJ v1` Canonical Suite" decision matrix** and **4-Client Copy-Paste Configuration Cards** (solving VS Code `.vscode/mcp.json` `"servers"` schema rejections, Claude Desktop `"url"` crashes, and Windows `cmd /c npx` `ENOENT` failures).
2. **Deterministic 11-Tool Routing & All-Bank UX Blueprint**: Disambiguated the 4 overlapping discovery tools (`luogu_find_topic_problems` 100-topic engine vs. `luogu_recommend_problems` 6-bucket offline seeds vs. `luogu_find_related_problems` hybrid waterfall vs. `luogu_search_problems` raw `type=P`), and specified exact fixes for `B`/`CF`/`AT`/`SP`/`UVA` problem ID resolution, `pid` self-recommendation exclusion, and alias-aware training-set search.
3. **OI-Native Metadata Enrichment & Human Error Microcopy**: Designed the backward-compatible **Luogu Difficulty Color/Tier (`红/橙/黄/绿/蓝/紫/黑`, `0..7`) + Execution Limits (`timeLimitMs`/`memoryLimitKb`) + Explicit Truncation Banner** payload wireframe, paired with actionable bilingual error rewrites in [`docs/USER_JOURNEY_COPY.md`](USER_JOURNEY_COPY.md).
