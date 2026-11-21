import { normalizePositiveInteger, normalizePositiveIntegers, normalizeProblemId } from "../shared/validation.js";
import type {
  CacheStats,
  LuoguGateway,
  ProblemRecord,
  ProblemSetRecord,
  ProblemSetSummary,
  ProblemSummary,
  SearchProblemSetsQuery,
  SearchProblemsQuery,
  SearchResults,
  UserProfile,
} from "../types.js";
import { TtlCache } from "./cache.js";

const DEFAULT_PROBLEM_TTL_MS = 5 * 60_000;
const DEFAULT_PROBLEM_SET_TTL_MS = 5 * 60_000;
const DEFAULT_SEARCH_TTL_MS = 2 * 60_000;
const DEFAULT_USER_PROFILE_TTL_MS = 2 * 60_000;

export interface CachedLuoguGatewayOptions {
  problemTtlMs?: number;
  problemSetTtlMs?: number;
  searchTtlMs?: number;
  userProfileTtlMs?: number;
  maxEntries?: number;
  now?: () => number;
}

/**
 * Caching and singleflight decorator around any LuoguGateway.
 * Clones cached values so callers cannot accidentally mutate shared cache entries.
 */
export class CachedLuoguGateway implements LuoguGateway {
  private readonly inner: LuoguGateway;
  private readonly cache: TtlCache<unknown>;
  private readonly problemTtlMs: number;
  private readonly problemSetTtlMs: number;
  private readonly searchTtlMs: number;
  private readonly userProfileTtlMs: number;

  constructor(inner: LuoguGateway, options: CachedLuoguGatewayOptions = {}) {
    this.inner = inner;
    this.cache = new TtlCache<unknown>({
      maxEntries: options.maxEntries,
      now: options.now,
    });
    this.problemTtlMs = options.problemTtlMs ?? DEFAULT_PROBLEM_TTL_MS;
    this.problemSetTtlMs = options.problemSetTtlMs ?? DEFAULT_PROBLEM_SET_TTL_MS;
    this.searchTtlMs = options.searchTtlMs ?? DEFAULT_SEARCH_TTL_MS;
    this.userProfileTtlMs = options.userProfileTtlMs ?? DEFAULT_USER_PROFILE_TTL_MS;
  }

  async searchProblems(options: SearchProblemsQuery): Promise<SearchResults<ProblemSummary>> {
    const key = buildProblemSearchKey(options);
    const result = await this.cache.getOrLoad(key, this.searchTtlMs, () => this.inner.searchProblems(options));
    return cloneValue(result);
  }

  async fetchProblem(pid: string): Promise<ProblemRecord> {
    const normalized = pid.trim() ? normalizeProblemId(pid) : "";
    if (!normalized) {
      return this.inner.fetchProblem(pid);
    }
    const result = await this.cache.getOrLoad(`problem:${normalized}`, this.problemTtlMs, () =>
      this.inner.fetchProblem(normalized)
    );
    return cloneValue(result);
  }

  async searchProblemSets(options: SearchProblemSetsQuery): Promise<SearchResults<ProblemSetSummary>> {
    const key = buildProblemSetSearchKey(options);
    const result = await this.cache.getOrLoad(key, this.searchTtlMs, () => this.inner.searchProblemSets(options));
    return cloneValue(result);
  }

  async fetchProblemSet(id: string): Promise<ProblemSetRecord> {
    const normalized = id.trim();
    if (!normalized) {
      return this.inner.fetchProblemSet(id);
    }
    const result = await this.cache.getOrLoad(`problem-set:${normalized}`, this.problemSetTtlMs, () =>
      this.inner.fetchProblemSet(normalized)
    );
    return cloneValue(result);
  }

  async fetchUserProfile(uid: number): Promise<UserProfile> {
    if (!Number.isInteger(uid) || uid < 1) {
      return this.inner.fetchUserProfile(uid);
    }
    const result = await this.cache.getOrLoad(`user:${uid}`, this.userProfileTtlMs, () =>
      this.inner.fetchUserProfile(uid)
    );
    return cloneValue(result);
  }

  getCacheStats(): CacheStats {
    return this.cache.stats();
  }

  clearCache(): void {
    this.cache.clear();
  }
}

function buildProblemSearchKey(options: SearchProblemsQuery): string {
  const keyword = typeof options.keyword === "string" ? options.keyword.trim() : "";
  const page = normalizePositiveInteger(options.page) ?? 1;
  const tagIds = normalizePositiveIntegers(options.tagIds).sort((a, b) => a - b);
  return `problem-search:${JSON.stringify([keyword, page, tagIds])}`;
}

function buildProblemSetSearchKey(options: SearchProblemSetsQuery): string {
  const keyword = typeof options.keyword === "string" ? options.keyword.trim() : "";
  const page = normalizePositiveInteger(options.page) ?? 1;
  const type = options.type ?? "";
  return `problem-set-search:${JSON.stringify([keyword, page, type])}`;
}

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}
