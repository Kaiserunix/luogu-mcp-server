# Documentation Cleanup Changelog

Audit performed against `src/`, `test/`, `scripts/`, `package.json`, `wrangler.jsonc`, and `server.json` on branch `swarm/doc-cleanup`.

## Pruned & Consolidated

- **Removed `docs/superpowers/plans/2026-04-30-luogu-topic-discovery-improvements.md` (616 lines) -> replaced by [topic-discovery.md](topic-discovery.md) (33 lines):**
  - The removed file was an AI-agent (`superpowers:executing-plans`) implementation checklist left behind after commit `b29765e`.
  - Contained unchecked `- [ ]` task steps, a hardcoded local Windows desktop path, and code snippets that disagreed with the current codebase:
    - Listed `@modelcontextprotocol/sdk` and plain object schemas instead of `@modelcontextprotocol/server` v2 and `z.object(...)` schemas (`src/server.ts`).
    - Listed only 5 `CORE_TOPICS` instead of the implemented 25 `CORE_TOPICS` + 75 `COVERAGE_TOPICS` (`src/topicCatalog.ts`).
    - Omitted candidate ranking (`rankProblems`/`scoreProblem`) implemented in `src/topicSearch.ts`.
    - Claimed `src/recommendations.ts` reused catalog aliases, whereas `src/tools.ts` (`findRelatedProblemsTool`) invokes `findTopicProblemsTool` directly.
  - Preserved all real rationale and provenance (97/100 raw search baseline, `SPFA`/`Prim`/`Treap` misses, 25/100 training-set recall, and `LUOGU_TOPIC_MIN_PROBLEM_HITS=98` threshold) in [topic-discovery.md](topic-discovery.md).

## Updated

- **[cloudflare-deployment.md](cloudflare-deployment.md):**
  - Replaced Windows agent-shell `cmd /c` command prefixes with standard cross-platform `npm` / `npx` commands verified against `package.json`.
  - Documented actual `wrangler.jsonc` custom domain route (`luogu-mcp.ksrnyx.top`), `server.json` URL, `/` + `/health` endpoints, MCP v2 JSON mode (`createMcpHandler`), wildcard `*` support in `LUOGU_MCP_ALLOWED_ORIGINS`, and `LUOGU_MCP_TOKEN` support in `scripts/cloudflare-smoke.mjs`.

## Added

- **[INDEX.md](INDEX.md):** Maps every surviving documentation file with a one-line purpose and status.

## Out-of-Scope Notes (Not Modified Here)

- `README.md` and `README.zh-CN.md` were intentionally left untouched (`README.md` line 261 still references a machine-specific `.continue/.env` path for `smoke:mimo`, whereas `scripts/mimo-mcp-smoke.mjs` reads `~/.continue/.env` via `os.homedir()`; left for top-level README maintenance).
