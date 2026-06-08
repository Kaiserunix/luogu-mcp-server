import {
  normalizeProblemPayload,
  normalizeProblemSearchPayload,
  normalizeProblemSetPayload,
  normalizeProblemSetSearchPayload,
  normalizeUserProfilePayload
} from "./normalizers.js";
import type { ProblemRecord, ProblemSetRecord, ProblemSetSummary, ProblemSummary, SearchResults, UserProfile } from "./types.js";

const DEFAULT_USER_AGENT = "luogu-mcp-server/0.2.1";
const RETRY_DELAYS_MS = [250, 750];

export interface LuoguClientOptions {
  fetchImpl?: typeof fetch;
  userAgent?: string;
}

export interface SearchOptions {
  keyword: string;
  page?: number;
  tagIds?: number[];
}

export type ProblemSetSearchType = "official" | "select";

export interface SearchProblemSetOptions {
  keyword: string;
  page?: number;
  type?: ProblemSetSearchType;
}

export class LuoguClient {
  private readonly fetchImpl: typeof fetch;
  private readonly userAgent: string;

  constructor(options: LuoguClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
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
    for (const tagId of normalizePositiveIntegers(options.tagIds)) {
      params.append("tag", String(tagId));
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

  async searchProblemSets(options: SearchProblemSetOptions): Promise<SearchResults<ProblemSetSummary>> {
    const keyword = requireNonEmpty(options.keyword, "keyword");
    const params = new URLSearchParams({
      keyword
    });
    const page = normalizePositiveInteger(options.page);
    if (page) {
      params.set("page", String(page));
    }
    if (options.type) {
      params.set("type", options.type);
    }

    const payload = await this.getJson(`https://www.luogu.com.cn/training/list?${params.toString()}`, {
      "x-lentille-request": "content-only"
    });
    return normalizeProblemSetSearchPayload(payload);
  }

  async fetchProblemSet(id: string): Promise<ProblemSetRecord> {
    const normalizedId = requireNonEmpty(id, "id");
    const payload = await this.getJson(`https://www.luogu.com.cn/training/${encodeURIComponent(normalizedId)}`, {
      "x-lentille-request": "content-only"
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
    let lastError: unknown;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        const response = await this.fetchImpl(url, {
          headers: {
            accept: "application/json, text/plain, */*",
            referer: "https://www.luogu.com.cn/",
            "user-agent": this.userAgent,
            ...headers
          }
        });

        if (!response.ok) {
          const error = new Error(`Luogu request failed: HTTP ${response.status} for ${url}`);
          if (isTransientStatus(response.status) && attempt < RETRY_DELAYS_MS.length) {
            lastError = error;
            await delay(RETRY_DELAYS_MS[attempt]);
            continue;
          }
          throw error;
        }

        return response.json();
      } catch (error) {
        lastError = error;
        if (attempt >= RETRY_DELAYS_MS.length || !isTransientError(error)) {
          throw error;
        }
        await delay(RETRY_DELAYS_MS[attempt]);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(`Luogu request failed for ${url}`);
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

function normalizePositiveIntegers(values: number[] | undefined): number[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.map(normalizePositiveInteger).filter((value): value is number => typeof value === "number"))];
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message === "fetch failed" || error.name === "AbortError";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
