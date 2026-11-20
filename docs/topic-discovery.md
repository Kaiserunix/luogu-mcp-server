# Topic Discovery Architecture

`luogu_search_problems` wraps Luogu's raw `GET /problem/list?type=P&keyword=...` endpoint directly. High-level topic discovery sits on top of it so agents can locate practice problems from English names, abbreviations, or broader algorithm terms without guessing Chinese search keywords.

## Background & Provenance

Live coverage baselines (`npm run smoke:topics`, 100 algorithm categories) established two design constraints:

- Raw keyword search hit `97/100` topics, missing `SPFA`, `Prim`, and `Treap`.
- Training-set search hit `25/100` topics, making training sets a quality supplement rather than the primary recall path.

## Current Implementation

| Module | Responsibility |
| --- | --- |
| `src/topicCatalog.ts` | Defines `ALGORITHM_TOPICS` (25 `CORE_TOPICS` with aliases, fallback queries, and known Luogu `tagIds` such as `[11]` for `树` / `二叉树`, plus 75 `COVERAGE_TOPICS` = 100 topics total). Exposes `listAlgorithmTopics`, `findTopic`, and `topicQueriesFor`. |
| `src/topicSearch.ts` | Implements `findTopicProblems`: expands a topic via `topicQueriesFor`, queries `LuoguClient.searchProblems` with optional `catalogTopic.tagIds`, deduplicates by uppercase problem id, filters `excludeProblemIds`, attaches `reason: "matched query: <query>"`, and ranks results before slicing to `limit` (default 8, max 30). |
| `src/tools.ts` | Exports `listAlgorithmTopicsTool`, `findTopicProblemsTool`, and wires `findRelatedProblemsTool` to fall back to `findTopicProblemsTool` (after static seed buckets in `src/recommendations.ts`, before free-text `searchProblemsTool`). |
| `src/server.ts` | Registers `luogu_list_algorithm_topics` (`readOnlyHint: true`, `openWorldHint: false`) and `luogu_find_topic_problems` (`readOnlyHint: true`, `openWorldHint: true`) with Zod v4 `z.object(...)` schemas on `@modelcontextprotocol/server` v2. |

## Ranking Heuristic (`src/topicSearch.ts`)

Candidates collected across all expanded queries are scored and sorted descending before applying `limit`:

- `+20`: problem title contains the requested topic, canonical topic, or an expanded query.
- `+30`: problem title also contains `模板` (standard template problem).
- `+25`: problem title contains `普通平衡树`.
- `+5`: numeric difficulty is in `1..5`; `-4` if difficulty `>= 6`.

## Verification

- Unit tests: `npm test` (`test/topicCatalog.test.ts`, `test/topicSearch.test.ts`, `test/tools.test.ts`, `test/server.test.ts`).
- Live 100-topic coverage smoke: `npm run smoke:topics` (`scripts/topic-coverage-smoke.mjs`) invokes `luogu_find_topic_problems` and `luogu_search_problem_sets` across 100 topics over stdio and enforces `LUOGU_TOPIC_MIN_PROBLEM_HITS` (default `98`).
