import {
  normalizeProblemPayload,
  normalizeProblemSearchPayload,
  normalizeProblemSetPayload,
  normalizeProblemSetSearchPayload,
  normalizeUserProfilePayload
} from "./normalizers.js";
import type { ProblemRecord, ProblemSetRecord, ProblemSetSummary, ProblemSummary, SearchResults, UserProfile } from "./types.js";

const DEFAULT_USER_AGENT = "luogu-mcp-server/0.2";

export interface LuoguClientOptions {
  fetchImpl?: typeof fetch;
  userAgent?: string;
}

export interface SearchOptions {
  keyword: string;
  page?: number;
}

export class LuoguClient {
  private readonly fetchImpl: typeof fetch;
  private readonly userAgent: string;

  constructor(options: LuoguClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  }

  async searchProblems(options: SearchOptions): Promise<SearchResults<ProblemSummary>> {
    const keyword = requireNonEmpty(options.keyword, "keyword");
    const params = new URLSearchParams({
      type: "P",
      keyword
    });
    const page = normalizePositiveInteger(options.page);
    if (page) {
      params.set("page", String(page));
    }

    const payload = await this.getJson(`https://www.luogu.com.cn/problem/list?${params.toString()}`, {
      "x-lentille-request": "content-only"
    });
    return normalizeProblemSearchPayload(payload);
  }

  async fetchProblem(pid: string): Promise<ProblemRecord> {
    const normalizedPid = requireNonEmpty(pid, "pid").toUpperCase();
    const payload = await this.getJson(`https://www.luogu.com.cn/problem/${encodeURIComponent(normalizedPid)}`, {
      "x-lentille-request": "content-only"
    });
    return normalizeProblemPayload(payload);
  }

  async searchProblemSets(options: SearchOptions): Promise<SearchResults<ProblemSetSummary>> {
    const keyword = requireNonEmpty(options.keyword, "keyword");
    const params = new URLSearchParams({
      keyword,
      _contentOnly: "1"
    });
    const page = normalizePositiveInteger(options.page);
    if (page) {
      params.set("page", String(page));
    }

    const payload = await this.getJson(`https://www.luogu.com.cn/training/list?${params.toString()}`, {
      "x-luogu-type": "content-only"
    });
    return normalizeProblemSetSearchPayload(payload);
  }

  async fetchProblemSet(id: string): Promise<ProblemSetRecord> {
    const normalizedId = requireNonEmpty(id, "id");
    const payload = await this.getJson(`https://www.luogu.com.cn/training/${encodeURIComponent(normalizedId)}?_contentOnly=1`, {
      "x-luogu-type": "content-only"
    });
    return normalizeProblemSetPayload(payload, normalizedId);
  }

  async fetchUserProfile(uid: number): Promise<UserProfile> {
    const normalizedUid = normalizePositiveInteger(uid);
    if (!normalizedUid) {
      throw new Error("uid must be a positive integer.");
    }

    const payload = await this.getJson(`https://www.luogu.com.cn/user/${normalizedUid}?_contentOnly=1`, {
      "x-lentille-request": "content-only"
    });
    return normalizeUserProfilePayload(payload);
  }

  private async getJson(url: string, headers: Record<string, string>): Promise<unknown> {
    const response = await this.fetchImpl(url, {
      headers: {
        "user-agent": this.userAgent,
        ...headers
      }
    });

    if (!response.ok) {
      throw new Error(`Luogu request failed: HTTP ${response.status} for ${url}`);
    }

    return response.json();
  }
}

function requireNonEmpty(value: string, name: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${name} is required.`);
  }
  return normalized;
}

function normalizePositiveInteger(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(1, Math.floor(value));
}
