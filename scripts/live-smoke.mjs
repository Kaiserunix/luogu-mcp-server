import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const PROBLEM_CASES = [
  ["P1001", "A+B Problem"],
  ["P1305", "\u65b0\u4e8c\u53c9\u6811"],
  ["P1205", "Transformations"],
  ["P1319", "\u538b\u7f29\u6280\u672f"],
  ["P1320", "\u538b\u7f29\u6280\u672f"],
  ["P4715", "\u6dd8\u6c70\u8d5b"],
  ["P4913", "\u4e8c\u53c9\u6811\u6df1\u5ea6"],
  ["P1030", "\u6c42\u5148\u5e8f\u6392\u5217"],
  ["P1364", "\u533b\u9662\u8bbe\u7f6e"]
];

const PROBLEM_SEARCH_QUERIES = [
  "\u4e8c\u53c9\u6811",
  "\u52a8\u6001\u89c4\u5212",
  "\u6700\u77ed\u8def",
  "\u524d\u7f00\u548c",
  "\u538b\u7f29\u6280\u672f",
  "\u77e9\u9635",
  "\u5e7b\u65b9",
  "\u5f69\u7968",
  "\u533b\u9662\u8bbe\u7f6e",
  "\u6dd8\u6c70\u8d5b"
];

const TRAINING_SEARCH_CASES = [
  { keyword: "\u5165\u95e8", type: "official", expectedId: "100" },
  { keyword: "\u4e8c\u53c9\u6811", type: "official", expectedId: "114" },
  { keyword: "\u52a8\u6001\u89c4\u5212", type: "select", expectedId: "1060" },
  { keyword: "\u7f51\u7edc\u6d41", type: "select", expectedId: "1230" }
];

const TRAINING_CASES = [
  ["100", "\u987a\u5e8f\u7ed3\u6784"],
  ["114", "\u4e8c\u53c9\u6811"],
  ["211", "\u52a8\u6001\u89c4\u5212"],
  ["208", "\u6700\u77ed\u8def"]
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
    "luogu_list_algorithm_topics",
    "luogu_find_topic_problems",
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
  for (const { keyword, type, expectedId } of TRAINING_SEARCH_CASES) {
    const mcp = await callTool("luogu_search_problem_sets", { keyword, type, limit: 8 });
    assert.ok(mcp.items.length > 0, `Expected training search results for ${keyword}/${type}`);
    assert.ok(mcp.items.some((item) => item.id === expectedId), `Expected ${keyword}/${type} to include training ${expectedId}`);
    report.trainingSearches.push({
      keyword,
      type,
      total: mcp.total,
      first: `${mcp.items[0].id} ${mcp.items[0].title}`,
      expectedFound: expectedId
    });
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
  const byTitle = await callTool("luogu_resolve_problem", { query: "\u538b\u7f29\u6280\u672f", maxStatementChars: 600 });
  assert.equal(byUrl.id, "P1305");
  assert.equal(byId.id, "P4913");
  assert.equal(byTitle.id, "P1319");
  report.resolves.push({ query: "url:P1305", id: byUrl.id, title: byUrl.title });
  report.resolves.push({ query: "p4913", id: byId.id, title: byId.title });
  report.resolves.push({ query: "compression", id: byTitle.id, title: byTitle.title });
}

async function checkRelatedProblems() {
  const cases = [
    { topic: "binary_tree", painPoint: "traversal_order_confusion", query: "\u4e8c\u53c9\u6811 \u904d\u5386", limit: 6 },
    { topic: "tree_distance", query: "\u6811 \u8ddd\u79bb", limit: 5 },
    { topic: "output_format", painPoint: "sentinel_input", query: "\u8f93\u51fa\u683c\u5f0f", limit: 5 }
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
    title: problem?.title ?? problem?.name ?? problem?.content?.name ?? problem?.contenu?.name,
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

async function fetchTrainingFromWeb(id) {
  const payload = await fetchJson(`https://www.luogu.com.cn/training/${encodeURIComponent(id)}`, {
    "x-lentille-request": "content-only"
  });
  const training = payload.data?.training ?? payload.currentData?.training;
  const firstRow = Array.isArray(training?.problems) ? training.problems[0] : undefined;
  const first = firstRow?.problem ?? firstRow;
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
      accept: "application/json, text/plain, */*",
      referer: "https://www.luogu.com.cn/",
      "user-agent": "luogu-mcp-live-smoke/0.2",
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
