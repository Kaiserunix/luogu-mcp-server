import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const PROBLEM_CASES = [
  ["P1001", "A+B Problem"],
  ["P1305", "新二叉树"],
  ["P1205", "Transformations"],
  ["P1319", "压缩技术"],
  ["P1320", "压缩技术"],
  ["P4715", "淘汰赛"],
  ["P4913", "二叉树深度"],
  ["P1030", "求先序排列"],
  ["P1364", "医院设置"]
];

const PROBLEM_SEARCH_QUERIES = ["二叉树", "动态规划", "最短路", "前缀和", "压缩技术", "矩阵", "幻方", "彩票", "医院设置", "淘汰赛"];
const TRAINING_SEARCH_QUERIES = ["入门", "二叉树", "动态规划", "图论", "最短路"];
const TRAINING_CASES = [
  ["100", "顺序结构"],
  ["114", "二叉树"],
  ["211", "动态规划"],
  ["208", "最短路"]
];

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  cwd: process.cwd(),
  stderr: "pipe"
});
const client = new Client({ name: "luogu-mcp-live-smoke", version: "0.1.0" });

const report = {
  tools: [],
  problemFetches: [],
  problemSearches: [],
  trainingSearches: [],
  trainingFetches: [],
  resolves: [],
  related: [],
  userProfiles: [],
  capabilities: []
};

try {
  await client.connect(transport);
  await checkTools();
  await checkProblemFetches();
  await checkProblemSearches();
  await checkTrainingSearches();
  await checkTrainingFetches();
  await checkResolveProblem();
  await checkRelatedProblems();
  await checkUserProfile();
  await checkCapabilities();
  console.log(JSON.stringify(report, null, 2));
} finally {
  await client.close();
}

async function checkTools() {
  const tools = await client.listTools();
  const names = tools.tools.map((tool) => tool.name);
  const expected = [
    "luogu_search_problems",
    "luogu_fetch_problem",
    "luogu_resolve_problem",
    "luogu_find_related_problems",
    "luogu_search_problem_sets",
    "luogu_fetch_problem_set",
    "luogu_recommend_problems",
    "luogu_get_user_profile",
    "luogu_get_capabilities"
  ];
  assert.deepEqual(names, expected);
  report.tools = names;
}

async function checkProblemFetches() {
  for (const [pid, titleNeedle] of PROBLEM_CASES) {
    const mcp = await callTool("luogu_fetch_problem", { pid, maxStatementChars: 2000 });
    const web = await fetchProblemFromWeb(pid);
    assert.equal(mcp.id, web.id);
    assert.equal(mcp.title, web.title);
    assert.match(mcp.title, new RegExp(escapeRegExp(titleNeedle)));
    assert.equal(mcp.samples.length, web.sampleCount);
    assert.equal(mcp.sourceUrl, `https://www.luogu.com.cn/problem/${pid}`);
    report.problemFetches.push({ pid, title: mcp.title, samples: mcp.samples.length, tags: mcp.tags.length });
  }
}

async function checkProblemSearches() {
  for (const keyword of PROBLEM_SEARCH_QUERIES) {
    const mcp = await callTool("luogu_search_problems", { keyword, limit: 5 });
    const web = await searchProblemsOnWeb(keyword);
    assert.equal(mcp.total, web.total);
    assert.deepEqual(
      mcp.items.slice(0, Math.min(3, web.ids.length)).map((item) => item.id),
      web.ids.slice(0, Math.min(3, mcp.items.length))
    );
    assert.ok(mcp.items.length > 0, `Expected problem search results for ${keyword}`);
    report.problemSearches.push({ keyword, total: mcp.total, first: `${mcp.items[0].id} ${mcp.items[0].title}` });
  }
}

async function checkTrainingSearches() {
  for (const keyword of TRAINING_SEARCH_QUERIES) {
    const mcp = await callTool("luogu_search_problem_sets", { keyword, limit: 5 });
    const web = await searchTrainingsOnWeb(keyword);
    assert.equal(mcp.total, web.total);
    assert.deepEqual(
      mcp.items.slice(0, Math.min(3, web.ids.length)).map((item) => item.id),
      web.ids.slice(0, Math.min(3, mcp.items.length))
    );
    report.trainingSearches.push({ keyword, total: mcp.total, first: mcp.items[0] ? `${mcp.items[0].id} ${mcp.items[0].title}` : null });
  }
}

async function checkTrainingFetches() {
  for (const [id, titleNeedle] of TRAINING_CASES) {
    const mcp = await callTool("luogu_fetch_problem_set", { id, limit: 8 });
    const web = await fetchTrainingFromWeb(id);
    assert.equal(mcp.id, web.id);
    assert.equal(mcp.title, web.title);
    assert.match(mcp.title, new RegExp(escapeRegExp(titleNeedle)));
    assert.ok(mcp.problems.length > 0, `Expected training ${id} to include problems`);
    assert.equal(mcp.problems[0].id, web.firstProblemId);
    report.trainingFetches.push({ id, title: mcp.title, problemCount: mcp.problemCount, first: `${mcp.problems[0].id} ${mcp.problems[0].title}` });
  }
}

async function checkResolveProblem() {
  const byUrl = await callTool("luogu_resolve_problem", { query: "https://www.luogu.com.cn/problem/P1305", maxStatementChars: 600 });
  const byId = await callTool("luogu_resolve_problem", { query: "p4913", maxStatementChars: 600 });
  const byTitle = await callTool("luogu_resolve_problem", { query: "压缩技术", maxStatementChars: 600 });
  assert.equal(byUrl.id, "P1305");
  assert.equal(byId.id, "P4913");
  assert.equal(byTitle.id, "P1319");
  report.resolves.push({ query: "url:P1305", id: byUrl.id, title: byUrl.title });
  report.resolves.push({ query: "p4913", id: byId.id, title: byId.title });
  report.resolves.push({ query: "压缩技术", id: byTitle.id, title: byTitle.title });
}

async function checkRelatedProblems() {
  const cases = [
    { topic: "binary_tree", painPoint: "traversal_order_confusion", query: "二叉树 遍历", limit: 6 },
    { topic: "tree_distance", query: "树 距离", limit: 5 },
    { topic: "output_format", painPoint: "sentinel_input", query: "输出格式", limit: 5 }
  ];
  for (const args of cases) {
    const result = await callTool("luogu_find_related_problems", args);
    assert.ok(result.items.length >= Math.min(3, args.limit));
    assert.ok(result.searchHints.length > 0);
    report.related.push({ args, items: result.items.map((item) => `${item.id} ${item.title}`) });
  }
}

async function checkUserProfile() {
  const profile = await callTool("luogu_get_user_profile", { uid: 1 });
  const web = await fetchUserFromWeb(1);
  assert.equal(profile.uid, 1);
  assert.equal(profile.name, web.name);
  assert.equal(profile.sourceUrl, "https://www.luogu.com.cn/user/1");
  report.userProfiles.push({ uid: profile.uid, name: profile.name, ranking: profile.ranking, followerCount: profile.followerCount });
}

async function checkCapabilities() {
  const capabilities = await callTool("luogu_get_capabilities", {});
  const authRequired = capabilities.tools.filter((tool) => tool.status === "auth_required").map((tool) => tool.name);
  assert.ok(authRequired.includes("luogu_get_recent_submissions"));
  assert.ok(authRequired.includes("luogu_search_solutions"));
  assert.ok(authRequired.includes("luogu_search_discussions"));
  report.capabilities = capabilities.tools.map((tool) => `${tool.name}:${tool.status}`);
}

async function callTool(name, args) {
  const result = await client.callTool({ name, arguments: args });
  return result.structuredContent;
}

async function fetchProblemFromWeb(pid) {
  const payload = await fetchJson(`https://www.luogu.com.cn/problem/${encodeURIComponent(pid)}`, {
    "x-lentille-request": "content-only"
  });
  const problem = payload.data?.problem;
  return {
    id: problem?.pid,
    title: problem?.title,
    sampleCount: Array.isArray(problem?.samples) ? problem.samples.length : 0
  };
}

async function searchProblemsOnWeb(keyword) {
  const params = new URLSearchParams({ type: "P", keyword });
  const payload = await fetchJson(`https://www.luogu.com.cn/problem/list?${params.toString()}`, {
    "x-lentille-request": "content-only"
  });
  const problems = payload.data?.problems;
  const rows = Array.isArray(problems?.result) ? problems.result : [];
  return {
    total: problems?.count ?? rows.length,
    ids: rows.map((item) => item.pid).filter(Boolean)
  };
}

async function searchTrainingsOnWeb(keyword) {
  const params = new URLSearchParams({ keyword, _contentOnly: "1" });
  const payload = await fetchJson(`https://www.luogu.com.cn/training/list?${params.toString()}`, {
    "x-luogu-type": "content-only"
  });
  const trainings = payload.currentData?.trainings;
  const rows = Array.isArray(trainings?.result) ? trainings.result : [];
  return {
    total: trainings?.count ?? rows.length,
    ids: rows.map((item) => String(item.id)).filter(Boolean)
  };
}

async function fetchTrainingFromWeb(id) {
  const payload = await fetchJson(`https://www.luogu.com.cn/training/${encodeURIComponent(id)}?_contentOnly=1`, {
    "x-luogu-type": "content-only"
  });
  const training = payload.currentData?.training;
  const first = Array.isArray(training?.problems) ? training.problems[0]?.problem : undefined;
  return {
    id: String(training?.id ?? id),
    title: training?.title ?? training?.name,
    firstProblemId: first?.pid
  };
}

async function fetchUserFromWeb(uid) {
  const payload = await fetchJson(`https://www.luogu.com.cn/user/${uid}?_contentOnly=1`, {
    "x-lentille-request": "content-only"
  });
  return {
    name: payload.data?.user?.name
  };
}

async function fetchJson(url, headers) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "luogu-mcp-live-smoke/0.1",
      ...headers
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
