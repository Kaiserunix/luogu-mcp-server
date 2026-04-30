import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const MIN_PROBLEM_HITS = Number(process.env.LUOGU_TOPIC_MIN_PROBLEM_HITS ?? 98);
const REQUEST_DELAY_MS = Number(process.env.LUOGU_TOPIC_DELAY_MS ?? 60);
const PROBLEM_LIMIT = Number(process.env.LUOGU_TOPIC_PROBLEM_LIMIT ?? 5);
const TRAINING_LIMIT = Number(process.env.LUOGU_TOPIC_TRAINING_LIMIT ?? 3);

const TOPICS = [
  topic("模拟"),
  topic("枚举"),
  topic("贪心"),
  topic("排序"),
  topic("二分"),
  topic("前缀和"),
  topic("差分"),
  topic("双指针"),
  topic("滑动窗口"),
  topic("哈希"),
  topic("字符串"),
  topic("KMP"),
  topic("AC自动机", "AC 自动机", "AC自动机"),
  topic("Manacher"),
  topic("字典树"),
  topic("Trie"),
  topic("后缀数组"),
  topic("后缀自动机"),
  topic("数学"),
  topic("数论"),
  topic("质数", "质数", "素数"),
  topic("筛法"),
  topic("欧拉函数"),
  topic("快速幂"),
  topic("矩阵快速幂"),
  topic("组合数学"),
  topic("容斥"),
  topic("博弈论"),
  topic("概率"),
  topic("高精度"),
  topic("位运算"),
  topic("状态压缩", "状压", "状态压缩"),
  topic("动态规划", "动态规划", "DP"),
  topic("线性DP", "线性 DP", "线性DP"),
  topic("背包"),
  topic("区间DP", "区间 DP", "区间DP"),
  topic("树形DP", "树形 DP", "树形DP"),
  topic("数位DP", "数位 DP", "数位DP"),
  topic("斜率优化"),
  topic("单调队列优化"),
  topic("期望DP", "期望 DP", "期望DP"),
  topic("图论"),
  topic("最短路"),
  topic("Dijkstra"),
  topic("Floyd"),
  topic("Bellman-Ford", "Bellman Ford", "Bellman-Ford"),
  topic("SPFA"),
  topic("最小生成树"),
  topic("Kruskal"),
  topic("Prim"),
  topic("拓扑排序"),
  topic("强连通分量"),
  topic("Tarjan"),
  topic("割点"),
  topic("桥", "桥", "割边"),
  topic("双连通分量"),
  topic("二分图"),
  topic("匈牙利算法", "匈牙利", "匈牙利算法"),
  topic("网络流"),
  topic("最大流"),
  topic("最小割"),
  topic("费用流"),
  topic("差分约束"),
  topic("树", { tagIds: [11] }),
  topic("二叉树", { tagIds: [11] }),
  topic("LCA"),
  topic("树链剖分"),
  topic("树的直径"),
  topic("树的重心"),
  topic("并查集"),
  topic("线段树"),
  topic("树状数组"),
  topic("平衡树"),
  topic("Treap"),
  topic("Splay"),
  topic("主席树"),
  topic("可持久化线段树"),
  topic("分块"),
  topic("莫队"),
  topic("单调栈"),
  topic("单调队列"),
  topic("堆"),
  topic("优先队列"),
  topic("递归"),
  topic("DFS"),
  topic("BFS"),
  topic("回溯"),
  topic("搜索"),
  topic("剪枝"),
  topic("记忆化搜索"),
  topic("计算几何"),
  topic("凸包"),
  topic("扫描线"),
  topic("多项式"),
  topic("FFT"),
  topic("NTT"),
  topic("线性基"),
  topic("2-SAT", "2-SAT", "2SAT"),
  topic("CDQ分治", "CDQ 分治", "CDQ分治"),
  topic("点分治")
];

assert.equal(TOPICS.length, 100, "The coverage smoke must cover exactly 100 algorithm topics.");

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  cwd: process.cwd(),
  stderr: "pipe"
});
const client = new Client({ name: "luogu-mcp-topic-coverage-smoke", version: "0.1.0" });

try {
  await client.connect(transport);
  const results = [];

  for (const entry of TOPICS) {
    const problem = await searchProblemsForTopic(entry);
    await sleep(REQUEST_DELAY_MS);
    const training = await searchTrainingsForTopic(entry);
    await sleep(REQUEST_DELAY_MS);
    results.push({ topic: entry.name, tagIds: entry.tagIds ?? [], problem, training });
  }

  const summary = summarize(results);
  const report = {
    summary,
    misses: results
      .filter((result) => !result.problem.hit)
      .map((result) => ({ topic: result.topic, attempts: result.problem.attempts })),
    trainingMisses: results.filter((result) => !result.training.hit).map((result) => result.topic),
    errorTopics: results.filter((result) => result.problem.error || result.training.error).map((result) => ({
      topic: result.topic,
      problemError: result.problem.error,
      trainingError: result.training.error
    })),
    samples: results
      .filter((result) => result.problem.hit)
      .slice(0, 15)
      .map((result) => ({
        topic: result.topic,
        query: result.problem.query,
        total: result.problem.total,
        first: result.problem.first,
        trainingTotal: result.training.total
      })),
    tagFilteredTopics: results
      .filter((result) => result.tagIds.length > 0)
      .map((result) => ({ topic: result.topic, tagIds: result.tagIds, total: result.problem.total, first: result.problem.first }))
  };

  console.log(JSON.stringify(report, null, 2));

  if (summary.problemHits < MIN_PROBLEM_HITS) {
    throw new Error(`Luogu topic coverage below threshold: ${summary.problemHits}/${summary.topicCount} problem searches hit, expected at least ${MIN_PROBLEM_HITS}.`);
  }
} finally {
  await client.close();
}

function topic(name, ...args) {
  const options = args.find((arg) => arg && typeof arg === "object" && !Array.isArray(arg)) ?? {};
  const queries = args.filter((arg) => typeof arg === "string");
  return {
    name,
    queries: queries.length > 0 ? queries : [name],
    tagIds: options.tagIds
  };
}

async function searchProblemsForTopic(entry) {
  const response = await safeCallTool("luogu_find_topic_problems", {
    topic: entry.name,
    limit: PROBLEM_LIMIT
  });
  if (!response.error && response.value?.items?.length > 0) {
    return summarizeTopicHit(response.value);
  }

  return {
    hit: false,
    query: entry.name,
    total: 0,
    first: null,
    attempts: [summarizeAttempt(entry.name, response)],
    error: response.error
  };
}

async function searchTrainingsForTopic(entry) {
  const attempts = [];

  for (const query of entry.queries) {
    const response = await safeCallTool("luogu_search_problem_sets", { keyword: query, limit: TRAINING_LIMIT });
    attempts.push(summarizeAttempt(query, response));
    if (!response.error && response.value?.total > 0) {
      return summarizeHit(query, response.value);
    }
  }

  const firstError = attempts.find((attempt) => attempt.error)?.error;
  return { hit: false, total: 0, first: null, attempts, error: firstError };
}

async function safeCallTool(name, args) {
  try {
    const result = await client.callTool({ name, arguments: args });
    return { value: unwrapToolResult(result) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function unwrapToolResult(result) {
  if (result.structuredContent) {
    return result.structuredContent;
  }

  const text = result.content?.find((item) => item.type === "text")?.text;
  if (!text) {
    throw new Error("MCP tool result did not include structuredContent or text JSON.");
  }
  return JSON.parse(text);
}

function summarizeAttempt(query, response) {
  if (response.error) {
    return { query, total: 0, error: response.error };
  }
  return { query, total: response.value?.total ?? 0 };
}

function summarizeHit(query, value) {
  const firstItem = value.items?.[0];
  return {
    hit: true,
    query,
    total: value.total,
    first: firstItem ? `${firstItem.id} ${firstItem.title}` : null,
    taggedResults: Array.isArray(value.items) ? value.items.filter((item) => item.tags?.length > 0).length : 0,
    attempts: [{ query, total: value.total }]
  };
}

function summarizeTopicHit(value) {
  const firstItem = value.items?.[0];
  return {
    hit: true,
    query: value.queriesTried?.join(" -> ") ?? value.topic,
    total: value.items?.length ?? 0,
    first: firstItem ? `${firstItem.id} ${firstItem.title}` : null,
    taggedResults: Array.isArray(value.items) ? value.items.filter((item) => item.tags?.length > 0).length : 0,
    attempts: Array.isArray(value.queriesTried) ? value.queriesTried.map((query) => ({ query, total: value.items?.length ?? 0 })) : []
  };
}

function summarize(results) {
  const problemHits = results.filter((result) => result.problem.hit).length;
  const trainingSetHits = results.filter((result) => result.training.hit).length;
  const eitherHits = results.filter((result) => result.problem.hit || result.training.hit).length;
  const taggedResultTopics = results.filter((result) => result.problem.taggedResults > 0).length;
  const tagFilteredTopics = results.filter((result) => result.tagIds.length > 0).length;
  const errors = results.filter((result) => result.problem.error || result.training.error).length;

  return {
    topicCount: results.length,
    problemHits,
    trainingSetHits,
    eitherHits,
    taggedResultTopics,
    tagFilteredTopics,
    errors,
    minProblemHits: MIN_PROBLEM_HITS,
    passed: problemHits >= MIN_PROBLEM_HITS
  };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
