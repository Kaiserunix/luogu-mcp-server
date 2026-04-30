# Luogu Topic Discovery Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Luogu MCP route reliably find algorithm practice problems for a student's pain point, even when the model uses English names, abbreviations, or broader teaching concepts.

**Architecture:** Keep `luogu_search_problems` as a raw Luogu search wrapper, and add a higher-level topic route on top of it. The topic route owns alias expansion, known Luogu tag ids, lightweight ranking, and explanation metadata so tutoring agents can recommend problems without guessing query wording.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk`, Zod, Vitest, Node live smoke scripts.

---

## Current Baseline

- Repository: `C:\Users\qwerf\Desktop\luogu-mcp-server`
- Latest live result: `npm run smoke:topics` hit `97/100` algorithm topics with raw problem search.
- Raw misses: `SPFA`, `Prim`, `Treap`.
- Training-set search hit only `25/100`, so training sets should be a quality supplement, not the main recall path.
- Existing tag filter support: `luogu_search_problems({ keyword, tagIds })`.

## File Map

- Create `src/topicCatalog.ts`: canonical algorithm topics, aliases, known Luogu tag ids, pain-point topic hints.
- Create `src/topicSearch.ts`: query expansion, deduplication, ranking, and structured search result composition.
- Modify `src/tools.ts`: add `luogu_list_algorithm_topics` and `luogu_find_topic_problems` handlers.
- Modify `src/server.ts`: register the two new MCP tools with Zod schemas and read-only annotations.
- Modify `src/recommendations.ts`: reuse catalog aliases for existing `luogu_find_related_problems` hints.
- Create `test/topicCatalog.test.ts`: catalog normalization and alias behavior.
- Create `test/topicSearch.test.ts`: multi-query fallback, deduplication, ranking, and match reasons.
- Modify `test/server.test.ts`: expected tool list includes the new tools.
- Modify `scripts/topic-coverage-smoke.mjs`: test the high-level topic route, not only raw keyword search.
- Modify `README.md`: document topic tools and the 100-topic smoke target.

---

### Task 1: Add a Topic Catalog

**Files:**
- Create: `src/topicCatalog.ts`
- Test: `test/topicCatalog.test.ts`

- [ ] **Step 1: Write failing catalog tests**

Add `test/topicCatalog.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { findTopic, listAlgorithmTopics, topicQueriesFor } from "../src/topicCatalog.js";

describe("Luogu topic catalog", () => {
  test("normalizes English aliases to Chinese search queries", () => {
    expect(topicQueriesFor("SPFA")).toEqual(["SPFA", "最短路"]);
    expect(topicQueriesFor("Prim")).toEqual(["Prim", "最小生成树"]);
    expect(topicQueriesFor("Treap")).toEqual(["Treap", "平衡树"]);
  });

  test("keeps known Luogu tag ids on catalog entries", () => {
    expect(findTopic("二叉树")?.tagIds).toEqual([11]);
    expect(findTopic("树")?.tagIds).toEqual([11]);
  });

  test("lists stable topic metadata for MCP clients", () => {
    const topics = listAlgorithmTopics();
    expect(topics.length).toBeGreaterThanOrEqual(100);
    expect(topics.find((topic) => topic.name === "最短路")?.aliases).toContain("SPFA");
  });
});
```

- [ ] **Step 2: Run test and verify red**

Run:

```powershell
cmd /c npm test -- test/topicCatalog.test.ts
```

Expected: FAIL because `src/topicCatalog.ts` does not exist.

- [ ] **Step 3: Implement minimal catalog**

Create `src/topicCatalog.ts`:

```ts
export interface LuoguAlgorithmTopic {
  name: string;
  aliases: string[];
  queries: string[];
  tagIds?: number[];
  painPoints?: string[];
}

const CORE_TOPICS: LuoguAlgorithmTopic[] = [
  { name: "树", aliases: ["tree"], queries: ["树"], tagIds: [11] },
  { name: "二叉树", aliases: ["binary tree", "binary_tree"], queries: ["二叉树"], tagIds: [11] },
  { name: "最短路", aliases: ["shortest path", "SPFA", "Dijkstra", "Floyd"], queries: ["最短路", "SPFA", "Dijkstra", "Floyd"] },
  { name: "最小生成树", aliases: ["MST", "Prim", "Kruskal"], queries: ["最小生成树", "Prim", "Kruskal"] },
  { name: "平衡树", aliases: ["Treap", "Splay"], queries: ["平衡树", "Treap", "Splay"] }
];

const COVERAGE_TOPICS = [
  "模拟", "枚举", "贪心", "排序", "二分", "前缀和", "差分", "双指针", "滑动窗口", "哈希",
  "字符串", "KMP", "AC自动机", "Manacher", "字典树", "Trie", "后缀数组", "后缀自动机", "数学", "数论",
  "质数", "筛法", "欧拉函数", "快速幂", "矩阵快速幂", "组合数学", "容斥", "博弈论", "概率", "高精度",
  "位运算", "状态压缩", "动态规划", "线性DP", "背包", "区间DP", "树形DP", "数位DP", "斜率优化", "单调队列优化",
  "期望DP", "图论", "拓扑排序", "强连通分量", "Tarjan", "割点", "桥", "双连通分量", "二分图", "匈牙利算法",
  "网络流", "最大流", "最小割", "费用流", "差分约束", "LCA", "树链剖分", "树的直径", "树的重心", "并查集",
  "线段树", "树状数组", "主席树", "可持久化线段树", "分块", "莫队", "单调栈", "单调队列", "堆", "优先队列",
  "递归", "DFS", "BFS", "回溯", "搜索", "剪枝", "记忆化搜索", "计算几何", "凸包", "扫描线",
  "多项式", "FFT", "NTT", "线性基", "2-SAT", "CDQ分治", "点分治"
];

export const ALGORITHM_TOPICS: LuoguAlgorithmTopic[] = mergeTopics([
  ...CORE_TOPICS,
  ...COVERAGE_TOPICS.map((name) => ({ name, aliases: [], queries: [name] }))
]);

export function listAlgorithmTopics(): LuoguAlgorithmTopic[] {
  return ALGORITHM_TOPICS.map((topic) => ({ ...topic, aliases: [...topic.aliases], queries: [...topic.queries], tagIds: topic.tagIds ? [...topic.tagIds] : undefined }));
}

export function findTopic(query: string): LuoguAlgorithmTopic | undefined {
  const normalized = normalize(query);
  return ALGORITHM_TOPICS.find((topic) => [topic.name, ...topic.aliases].some((value) => normalize(value) === normalized));
}

export function topicQueriesFor(query: string): string[] {
  const topic = findTopic(query);
  if (!topic) {
    return [query.trim()].filter(Boolean);
  }
  return unique([query.trim(), ...topic.queries]);
}

function mergeTopics(topics: LuoguAlgorithmTopic[]): LuoguAlgorithmTopic[] {
  const byName = new Map<string, LuoguAlgorithmTopic>();
  for (const topic of topics) {
    if (!byName.has(topic.name)) {
      byName.set(topic.name, topic);
    }
  }
  return [...byName.values()];
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
```

- [ ] **Step 4: Run catalog tests and verify green**

Run:

```powershell
cmd /c npm test -- test/topicCatalog.test.ts
```

Expected: PASS.

---

### Task 2: Add Topic Search Composition

**Files:**
- Create: `src/topicSearch.ts`
- Modify: `src/tools.ts`
- Test: `test/topicSearch.test.ts`

- [ ] **Step 1: Write failing topic search tests**

Add `test/topicSearch.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { findTopicProblemsTool } from "../src/tools.js";

describe("topic problem search", () => {
  test("falls back from English aliases to Chinese topic queries", async () => {
    const calls: string[] = [];
    const fakeFetch = async (url: string | URL | Request): Promise<Response> => {
      calls.push(String(url));
      const href = String(url);
      const rows = href.includes("keyword=%E6%9C%80%E7%9F%AD%E8%B7%AF")
        ? [{ pid: "P4779", title: "【模板】单源最短路径（标准版）", difficulty: 3, tags: [93] }]
        : [];
      return new Response(JSON.stringify({ data: { problems: { count: rows.length, result: rows } } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    };

    const result = await findTopicProblemsTool({ topic: "SPFA", limit: 3 }, fakeFetch as typeof fetch);

    expect(result.queriesTried).toEqual(["SPFA", "最短路"]);
    expect(result.items[0].id).toBe("P4779");
    expect(result.items[0].reason).toContain("matched query: 最短路");
    expect(calls.length).toBe(2);
  });

  test("deduplicates results across multiple queries", async () => {
    const fakeFetch = async (): Promise<Response> =>
      new Response(
        JSON.stringify({
          data: {
            problems: {
              count: 2,
              result: [
                { pid: "P3369", title: "【模板】普通平衡树", difficulty: 4, tags: [42] },
                { pid: "P3369", title: "【模板】普通平衡树", difficulty: 4, tags: [42] }
              ]
            }
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );

    const result = await findTopicProblemsTool({ topic: "Treap", limit: 5 }, fakeFetch as typeof fetch);

    expect(result.items.map((item) => item.id)).toEqual(["P3369"]);
  });
});
```

- [ ] **Step 2: Run tests and verify red**

Run:

```powershell
cmd /c npm test -- test/topicSearch.test.ts
```

Expected: FAIL because `findTopicProblemsTool` is not exported.

- [ ] **Step 3: Implement topic search module**

Create `src/topicSearch.ts`:

```ts
import { findTopic, topicQueriesFor } from "./topicCatalog.js";
import { LuoguClient } from "./luoguClient.js";
import type { ProblemSummary } from "./types.js";

export interface FindTopicProblemsInput {
  topic: string;
  limit?: number;
  excludeProblemIds?: string[];
}

export interface FindTopicProblemsResult {
  topic: string;
  canonicalTopic?: string;
  queriesTried: string[];
  items: ProblemSummary[];
}

export async function findTopicProblems(input: FindTopicProblemsInput, fetchImpl?: typeof fetch): Promise<FindTopicProblemsResult> {
  const topic = input.topic.trim();
  if (!topic) {
    throw new Error("topic is required.");
  }

  const catalogTopic = findTopic(topic);
  const queries = topicQueriesFor(topic);
  const limit = normalizeLimit(input.limit, 8, 30);
  const excluded = new Set((input.excludeProblemIds ?? []).map((id) => id.toUpperCase()));
  const seen = new Set<string>();
  const items: ProblemSummary[] = [];
  const client = new LuoguClient({ fetchImpl });

  for (const query of queries) {
    const results = await client.searchProblems({ keyword: query, tagIds: catalogTopic?.tagIds });
    for (const item of results.items) {
      const id = item.id.toUpperCase();
      if (seen.has(id) || excluded.has(id)) {
        continue;
      }
      seen.add(id);
      items.push({ ...item, reason: `matched query: ${query}` });
      if (items.length >= limit) {
        return { topic, canonicalTopic: catalogTopic?.name, queriesTried: queries, items };
      }
    }
  }

  return { topic, canonicalTopic: catalogTopic?.name, queriesTried: queries, items };
}

function normalizeLimit(value: number | undefined, fallback: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(1, Math.min(Math.floor(value), max));
}
```

Modify `src/tools.ts`:

```ts
import { findTopicProblems, type FindTopicProblemsInput, type FindTopicProblemsResult } from "./topicSearch.js";
import { listAlgorithmTopics } from "./topicCatalog.js";
```

Add exports:

```ts
export async function findTopicProblemsTool(input: FindTopicProblemsInput, fetchImpl?: typeof fetch): Promise<FindTopicProblemsResult> {
  return findTopicProblems(input, fetchImpl);
}

export function listAlgorithmTopicsTool() {
  return { platform: "luogu", items: listAlgorithmTopics() };
}
```

- [ ] **Step 4: Run topic search tests and verify green**

Run:

```powershell
cmd /c npm test -- test/topicSearch.test.ts
```

Expected: PASS.

---

### Task 3: Register MCP Topic Tools

**Files:**
- Modify: `src/server.ts`
- Modify: `test/server.test.ts`

- [ ] **Step 1: Write failing server test**

Modify `test/server.test.ts` expected tool list to include:

```ts
"luogu_list_algorithm_topics",
"luogu_find_topic_problems",
```

Place them after `luogu_find_related_problems`.

- [ ] **Step 2: Run test and verify red**

Run:

```powershell
cmd /c npm test -- test/server.test.ts
```

Expected: FAIL because the new tools are not registered.

- [ ] **Step 3: Register tools**

Modify `src/server.ts` imports:

```ts
  findTopicProblemsTool,
  listAlgorithmTopicsTool,
```

Add names in `LUOGU_MCP_TOOL_NAMES`:

```ts
  "luogu_list_algorithm_topics",
  "luogu_find_topic_problems",
```

Register after `luogu_find_related_problems`:

```ts
  server.registerTool(
    "luogu_list_algorithm_topics",
    {
      title: "List Luogu Algorithm Topics",
      description: "List canonical algorithm topics, aliases, and known Luogu tag ids used by the high-level topic search route.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        openWorldHint: false
      }
    },
    async () => toToolResult(listAlgorithmTopicsTool())
  );

  server.registerTool(
    "luogu_find_topic_problems",
    {
      title: "Find Luogu Topic Problems",
      description: "Find Luogu practice problems for an algorithm topic using aliases, known Luogu tag ids, deduplication, and match reasons.",
      inputSchema: {
        topic: z.string().min(1).describe("Algorithm topic or alias, such as SPFA, Prim, Treap, 二叉树, or 动态规划."),
        limit: z.number().int().min(1).max(30).optional().describe("Maximum returned items."),
        excludeProblemIds: z.array(z.string().min(1)).max(100).optional().describe("Luogu problem ids to exclude from recommendations.")
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true
      }
    },
    async (input) => toToolResult(await findTopicProblemsTool(input))
  );
```

- [ ] **Step 4: Run server test and verify green**

Run:

```powershell
cmd /c npm test -- test/server.test.ts
```

Expected: PASS.

---

### Task 4: Upgrade Existing Related Recommendation Flow

**Files:**
- Modify: `src/tools.ts`
- Modify: `test/tools.test.ts`

- [ ] **Step 1: Write failing test for related search aliases**

Add to `test/tools.test.ts`:

```ts
test("finds related problems through topic alias fallback", async () => {
  const fakeFetch = async (url: string | URL | Request): Promise<Response> => {
    const href = String(url);
    const rows = href.includes("keyword=%E5%B9%B3%E8%A1%A1%E6%A0%91")
      ? [{ pid: "P3369", title: "【模板】普通平衡树", difficulty: 4, tags: [42] }]
      : [];
    return new Response(JSON.stringify({ data: { problems: { count: rows.length, result: rows } } }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };

  const result = await findRelatedProblemsTool({ topic: "Treap", limit: 3 }, fakeFetch as typeof fetch);

  expect(result.searchHints).toContain("Treap");
  expect(result.items.map((item) => item.id)).toContain("P3369");
});
```

- [ ] **Step 2: Run test and verify red**

Run:

```powershell
cmd /c npm test -- test/tools.test.ts
```

Expected: FAIL because `findRelatedProblemsTool` only does a single search query.

- [ ] **Step 3: Reuse topic search in related flow**

Modify `src/tools.ts` inside `findRelatedProblemsTool` after static recommendations are collected:

```ts
  if (items.length < limit && input.topic) {
    const topicResult = await findTopicProblemsTool(
      {
        topic: input.topic,
        limit,
        excludeProblemIds: [input.currentProblemId, ...items.map((item) => item.id)].filter((id): id is string => Boolean(id))
      },
      fetchImpl
    );
    for (const item of topicResult.items) {
      if (!items.some((existing) => existing.id === item.id)) {
        items.push(item);
      }
      if (items.length >= limit) {
        break;
      }
    }
  }
```

Keep the existing free-text `query` fallback after this block.

- [ ] **Step 4: Run tools tests and verify green**

Run:

```powershell
cmd /c npm test -- test/tools.test.ts
```

Expected: PASS.

---

### Task 5: Upgrade 100-Topic Smoke to Prove the New Route

**Files:**
- Modify: `scripts/topic-coverage-smoke.mjs`

- [ ] **Step 1: Change smoke script target tool**

In `scripts/topic-coverage-smoke.mjs`, replace the primary call:

```js
const response = await safeCallTool("luogu_search_problems", args);
```

with:

```js
const response = await safeCallTool("luogu_find_topic_problems", {
  topic: entry.name,
  limit: PROBLEM_LIMIT
});
```

Keep raw `luogu_search_problems` only as a diagnostic fallback field if needed.

- [ ] **Step 2: Raise the expected threshold**

Change:

```js
const MIN_PROBLEM_HITS = Number(process.env.LUOGU_TOPIC_MIN_PROBLEM_HITS ?? 85);
```

to:

```js
const MIN_PROBLEM_HITS = Number(process.env.LUOGU_TOPIC_MIN_PROBLEM_HITS ?? 98);
```

- [ ] **Step 3: Run live topic smoke**

Run:

```powershell
cmd /c npm run smoke:topics
```

Expected: PASS with at least `98/100` topic hits. The three known raw misses should now be recovered by aliases:

- `SPFA` via `最短路`
- `Prim` via `最小生成树`
- `Treap` via `平衡树`

If fewer than 98 hit, add aliases to `src/topicCatalog.ts` and rerun this step.

---

### Task 6: Documentation and Final Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document new tools**

Add to README tool table:

```md
| `luogu_list_algorithm_topics` | List canonical algorithm topics, aliases, and known tag ids. |
| `luogu_find_topic_problems` | Find topic practice problems using aliases, tag ids, deduplication, and match reasons. |
```

Add example:

```json
{
  "topic": "Treap",
  "limit": 5,
  "excludeProblemIds": ["P3369"]
}
```

- [ ] **Step 2: Run complete verification**

Run:

```powershell
cmd /c npm test
cmd /c npm run build
cmd /c npm run smoke:topics
cmd /c npm run smoke:live
```

Expected:

- Unit tests: all pass.
- Build: exit code 0.
- Topic smoke: at least `98/100`.
- Live smoke: all existing route checks pass.

- [ ] **Step 3: Commit**

Run:

```powershell
git status --short
git add README.md src/topicCatalog.ts src/topicSearch.ts src/tools.ts src/server.ts src/recommendations.ts test/topicCatalog.test.ts test/topicSearch.test.ts test/tools.test.ts test/server.test.ts scripts/topic-coverage-smoke.mjs
git diff --cached --check
git commit -m "feat: add Luogu topic discovery route"
```

Expected: commit succeeds with only intended files.

## Self-Review

- Spec coverage: The plan covers alias recovery, tag-aware search, topic recommendation, MCP discoverability, and live 100-topic validation.
- No placeholders: Each task includes concrete file paths, test code, implementation snippets, commands, and expected results.
- Type consistency: `FindTopicProblemsInput`, `FindTopicProblemsResult`, `LuoguAlgorithmTopic`, `findTopicProblemsTool`, and `listAlgorithmTopicsTool` are named consistently across tasks.
