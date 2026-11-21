# Luogu MCP Server — Product Strategy, Positioning & Engineering Roadmap

> **Status**: Pod A Cross-Functional Consensus (Tech Lead + Marketing & Growth + Simulated OI/ACM Student)
> **Scope**: Clear positioning vs. `ketherworks/competitive-programming-mcp`, onboarding conversion fixes, Cloudflare egress truth, and P0–P2 engineering backlog for `Kaiserunix/luogu-mcp-server`.

---

## 1. Strategic Positioning: Resolving the Two-Repo Split

Users discovering both `Kaiserunix/luogu-mcp-server` and `ketherworks/competitive-programming-mcp` previously encountered two overlapping Luogu MCP implementations and multiple conflicting hosted URLs. Pod A has codified a clean two-tier portfolio architecture:

| Repository | Role & Edition | Tool Surface | Target User |
| :--- | :--- | :--- | :--- |
| **`Kaiserunix/luogu-mcp-server`** *(this repo)* | **Luogu Deep Pedagogy & Topic-Discovery Edition** (`luogu-v0.2`) | **11 specialized `luogu_*` tools**: 100-topic bilingual alias catalog, template-prioritized topic search (`>=98/100` live topic coverage), hybrid official + selected training-set (`题单`) search, pain-point remediation recommender, public user profile, plus offline Markdown topic-pack downloader. | OI / ICPC students, CS coaches, and Luogu-focused AI workflows (Cursor, VS Code, Claude Desktop, npm `npx -y luogu-mcp-server`, MCP Registry). |
| **[`ketherworks/competitive-programming-mcp`](https://github.com/ketherworks/competitive-programming-mcp)** | **Unified Multi-OJ Contract Suite** (`OJ v1`) | **4 strict normalized `oj_*` read tools** (`oj_capabilities`, `oj_health`, `oj_search_problems`, `oj_fetch_problem`) spanning Codeforces, AtCoder, and Luogu, plus local `stdio` NowCoder runner & LeetCode guide. | Multi-platform AI agents and IDE integrations (such as `student-autocomplete-lab`) requiring one uniform typed schema across OJs. |

### Hidden Gems Promoted to Headline Value
1. **100-Topic Bilingual Alias & Pedagogical Template Ranking (`luogu_find_topic_problems`)**: Expands OI shorthand (`Treap`, `SPFA`, `状压`, `割边`) into bilingual Chinese/English queries and boosts `【模板】` and approachable difficulty bands (`1..5`) over brutal NOI problems (`>=98/100` verified live topic hit rate).
2. **Hybrid Official + Community Training-Set Aggregator (`luogu_search_problem_sets`, `type: "all"`)**: Compensates for Luogu's asymmetric web endpoints by fetching official indexes and user-curated `select` sets in parallel, normalizing titles, and deduplicating results.
3. **Context-Safe Statement Trimming & Multi-Schema Normalizer**: Protects LLM context windows with `maxStatementChars` (default `5000`) while handling Luogu's evolving `content` / `contenu` / `description` Lentille payloads.
4. **Clarified Tool Selection (`luogu_find_topic_problems` vs `luogu_recommend_problems`)**: Explicitly guide users and agents that `luogu_find_topic_problems` is the primary 100-topic discovery engine, while `luogu_recommend_problems` serves 6 curated beginner seed buckets (`binary_tree`, `tree_distance`, `recursion`, `output_order`, `output_format`, `matrix`).

---

## 2. Code-Truth & Deployment Boundaries

1. **Read-Only Contract**: All 11 tools access Luogu's public content-only endpoints. Submissions, remote code execution, private solutions, and discussion pages require authenticated sessions and are intentionally excluded.
2. **Cloudflare Worker Egress Caveat**: While `src/worker.ts` provides a valid Streamable HTTP Worker entrypoint, Luogu (`www.luogu.com.cn`) frequently blocks or challenges shared Cloudflare Worker egress IPs on real reads even when `/health` returns `200 OK` (the same upstream behavior documented in `ketherworks/competitive-programming-mcp/docs/deployment/production-endpoints.md`).
   - **Recommended reliable paths**: Hosted endpoint `https://luogu-mcp.ksrnyx.top/mcp`, local `npx -y luogu-mcp-server` (`stdio`), or self-hosting in a Node 22 container behind HTTPS/private tunnel.
3. **Client Configuration Accuracy**: Document exact copy-pasteable configs for **Cursor / Windsurf (`"mcpServers"`)**, **VS Code (`.vscode/mcp.json` using `"servers"` + `"type": "http"`)**, and **Windows local `stdio` (`cmd /c npx -y luogu-mcp-server`)** to prevent first-minute schema or `ENOENT` failures.
4. **Hygiene**: Remove hardcoded developer machine paths (`C:\Users\<user>\.continue\.env`) from public docs.

---

## 3. Prioritized Engineering & Decoupling Roadmap

### P0 — Reliability, CI & Beginner Problem Coverage
1. **Add GitHub Actions Test CI Workflow (`.github/workflows/ci.yml`)**: Currently only `publish-mcp.yml` exists; add automated `npm test` + `npm run build` checks on every push/PR.
2. **Add Fetch Timeouts (`AbortSignal.timeout`) in `src/luoguClient.ts:112`**: Prevent hung MCP tool calls when Luogu throttles or stalls requests, returning actionable Chinese/English hints on HTTP `403/503`.
3. **Fix `B`-Prefix & Remote-Judge Problem ID Resolution (`src/tools.ts:365-367`, `src/luoguClient.ts:43-46`)**: Official beginner training sets (e.g. `100`) return `B2002`, `B3642`, etc., and Luogu also hosts `CF*`, `AT_*`, `UVA*`, `SP*`, `T*`, `U*`. Expand `extractProblemId` regex beyond `P\d+` so pasting `https://www.luogu.com.cn/problem/B2002` resolves cleanly instead of throwing `No Luogu problem matched query`.

### P1 — Shared Core Extraction & Error UX
1. **Extract Shared `luogu-lentille-core` Client**: Share the Lentille payload normalizer and HTTP parser between `Kaiserunix/luogu-mcp-server` and `ketherworks/competitive-programming-mcp/packages/luogu` so upstream Luogu HTML/JSON changes are fixed once.
2. **Actionable Tool Descriptions & Error Hints**: Tighten `src/server.ts` descriptions to clearly steer models toward `luogu_find_topic_problems` (100 topics) vs `luogu_recommend_problems` (6 beginner buckets), and emit friendly guidance when Node `< 20` or browser CORS `Origin` triggers an error.

### P2 — Optional Self-Hosted Node HTTP Entrypoint
1. Add a lightweight Node 22 Streamable HTTP entrypoint (or Docker Compose template) alongside `src/worker.ts` so self-hosters avoid Cloudflare shared egress blocks cleanly.
