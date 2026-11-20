import { LuoguClientError } from "../../src/client/errors.js";
import type {
  LuoguGateway,
  ProblemRecord,
  ProblemSetRecord,
  ProblemSetSummary,
  ProblemSummary,
  SearchProblemSetsQuery,
  SearchProblemsQuery,
  SearchResults,
  UserProfile,
} from "../../src/types.js";

export const PROBLEM_P1305_PAYLOAD = {
  code: 200,
  data: {
    problem: {
      pid: "P1305",
      title: "新二叉树",
      difficulty: 2,
      tags: [11, 72],
      description: "Build a binary tree from child triples and print preorder.",
      inputFormat: "First line n, then n lines of triples.",
      outputFormat: "Preorder traversal string.",
      samples: [["6\nabc\nbdi\ncj*\nd**\ni**\nj**", "abdicj"]],
      hint: "Use * for empty children.",
    },
  },
};

export const PROBLEM_HTML_LENTILLE_FIXTURE = `<!DOCTYPE html>
<html lang="zh-CN">
<head><title>P1001 A+B Problem - 洛谷</title></head>
<body>
  <div id="app">Loading...</div>
  <script id="lentille-context" type="application/json">${JSON.stringify({
    code: 200,
    currentTemplate: "ProblemShow",
    data: {
      problem: {
        pid: "P1001",
        name: "A+B Problem",
        difficulty: 1,
        tags: [{ id: 1, name: "模拟" }],
        content: {
          background: "",
          description: "Calculate a + b.",
          formatI: "Two integers.",
          formatO: "One integer.",
        },
        samples: [["1 2", "3"]],
      },
    },
  })}</script>
</body>
</html>`;

export const LOGIN_HTML_FIXTURE = `<!DOCTYPE html>
<html>
<head><title>登录 - 洛谷</title></head>
<body><form action="/auth/login" method="post"></form></body>
</html>`;

export const CLOUDFLARE_CHALLENGE_HTML_FIXTURE = `<!DOCTYPE html>
<html>
<head><title>Just a moment...</title></head>
<body><div id="cf-browser-verification">Checking your browser...</div></body>
</html>`;

export const DEFAULT_PROBLEMS: Record<string, ProblemRecord> = {
  P1305: {
    platform: "luogu",
    id: "P1305",
    title: "新二叉树",
    sourceUrl: "https://www.luogu.com.cn/problem/P1305",
    difficulty: 2,
    tags: ["11", "72"],
    statement: "Build a binary tree from child triples and print preorder.",
    inputFormat: "First line n, then n lines of triples.",
    outputFormat: "Preorder traversal string.",
    samples: [{ input: "6\nabc", output: "abc" }],
    hint: "Use * for empty children.",
  },
  P3369: {
    platform: "luogu",
    id: "P3369",
    title: "【模板】普通平衡树",
    sourceUrl: "https://www.luogu.com.cn/problem/P3369",
    difficulty: 4,
    tags: ["42"],
    statement: "Maintain a multiset supporting rank and predecessor queries.",
    inputFormat: "n operations",
    outputFormat: "Query answers",
    samples: [{ input: "1 1", output: "1" }],
    hint: "Treap or Splay",
  },
  B2002: {
    platform: "luogu",
    id: "B2002",
    title: "Hello,World!",
    sourceUrl: "https://www.luogu.com.cn/problem/B2002",
    difficulty: 1,
    tags: ["353"],
    statement: "Print Hello,World!",
    inputFormat: "None",
    outputFormat: "Hello,World!",
    samples: [{ input: "", output: "Hello,World!" }],
  },
};

export interface FakeGatewayOptions {
  problems?: Record<string, ProblemRecord>;
  searchResults?: Record<string, ProblemSummary[]>;
  problemSets?: Record<string, ProblemSetRecord>;
  problemSetSearches?: Record<string, ProblemSetSummary[]>;
  users?: Record<number, UserProfile>;
  onSearchProblems?: (query: SearchProblemsQuery) => SearchResults<ProblemSummary> | Promise<SearchResults<ProblemSummary>>;
}

/** Deterministic in-memory LuoguGateway test double requiring zero HTTP/fetch calls. */
export class FakeLuoguGateway implements LuoguGateway {
  readonly calls: Array<{ method: string; arg: unknown }> = [];
  private readonly problems: Record<string, ProblemRecord>;
  private readonly searchResults: Record<string, ProblemSummary[]>;
  private readonly problemSets: Record<string, ProblemSetRecord>;
  private readonly problemSetSearches: Record<string, ProblemSetSummary[]>;
  private readonly users: Record<number, UserProfile>;
  private readonly onSearchProblems?: FakeGatewayOptions["onSearchProblems"];

  constructor(options: FakeGatewayOptions = {}) {
    this.problems = options.problems ?? { ...DEFAULT_PROBLEMS };
    this.searchResults = options.searchResults ?? {};
    this.problemSets = options.problemSets ?? {};
    this.problemSetSearches = options.problemSetSearches ?? {};
    this.users = options.users ?? {
      1: {
        uid: 1,
        name: "kkksc03",
        sourceUrl: "https://www.luogu.com.cn/user/1",
        ranking: 3916,
        passedProblemCount: null,
        submittedProblemCount: null,
        guRating: 217,
      },
    };
    this.onSearchProblems = options.onSearchProblems;
  }

  async searchProblems(options: SearchProblemsQuery): Promise<SearchResults<ProblemSummary>> {
    this.calls.push({ method: "searchProblems", arg: options });
    if (this.onSearchProblems) {
      return this.onSearchProblems(options);
    }
    const items = this.searchResults[options.keyword] ?? [];
    return { total: items.length, items };
  }

  async fetchProblem(pid: string): Promise<ProblemRecord> {
    this.calls.push({ method: "fetchProblem", arg: pid });
    const match = this.problems[pid] ?? this.problems[pid.toUpperCase()];
    if (!match) {
      throw new LuoguClientError("NOT_FOUND", `Problem ${pid} not found.`, { status: 404 });
    }
    return match;
  }

  async searchProblemSets(options: SearchProblemSetsQuery): Promise<SearchResults<ProblemSetSummary>> {
    this.calls.push({ method: "searchProblemSets", arg: options });
    const key = `${options.type ?? "all"}:${options.keyword}`;
    const items = this.problemSetSearches[key] ?? this.problemSetSearches[options.keyword] ?? [];
    return { total: items.length, items };
  }

  async fetchProblemSet(id: string): Promise<ProblemSetRecord> {
    this.calls.push({ method: "fetchProblemSet", arg: id });
    const match = this.problemSets[id];
    if (!match) {
      throw new LuoguClientError("NOT_FOUND", `Training set ${id} not found.`, { status: 404 });
    }
    return match;
  }

  async fetchUserProfile(uid: number): Promise<UserProfile> {
    this.calls.push({ method: "fetchUserProfile", arg: uid });
    const match = this.users[uid];
    if (!match) {
      throw new LuoguClientError("NOT_FOUND", `User ${uid} not found.`, { status: 404 });
    }
    return match;
  }
}
