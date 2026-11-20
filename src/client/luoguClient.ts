import { defaultLuoguParser } from "../parser/normalizers.js";
import {
  normalizePositiveInteger,
  normalizePositiveIntegers,
  normalizeProblemId,
  requireNonEmpty,
  requirePositiveInteger,
} from "../shared/validation.js";
import type {
  LuoguGateway,
  LuoguParser,
  ProblemRecord,
  ProblemSetRecord,
  ProblemSetSearchType,
  ProblemSetSummary,
  ProblemSummary,
  SearchProblemSetsQuery,
  SearchProblemsQuery,
  SearchResults,
  UserProfile,
} from "../types.js";
import { LuoguClientError, toClientErrorFromPayload } from "./errors.js";

const DEFAULT_BASE_URL = "https://www.luogu.com.cn";
const DEFAULT_USER_AGENT = "luogu-mcp-server/0.2.1";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_DELAYS_MS = [250, 750];
const DEFAULT_MAX_RETRY_AFTER_MS = 5_000;

export type { ProblemSetSearchType };
export type SearchOptions = SearchProblemsQuery;
export type SearchProblemSetOptions = SearchProblemSetsQuery;

export interface LuoguClientOptions {
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  userAgent?: string;
  timeoutMs?: number;
  retryDelaysMs?: number[];
  maxRetryAfterMs?: number;
  parser?: LuoguParser;
  sleep?: (ms: number) => Promise<void>;
}

/** HTTP client for Luogu public content-only endpoints, decoupled from payload parsing via LuoguParser. */
export class LuoguClient implements LuoguGateway {
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;
  private readonly userAgent: string;
  private readonly timeoutMs: number;
  private readonly retryDelaysMs: number[];
  private readonly maxRetryAfterMs: number;
  private readonly parser: LuoguParser;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: LuoguClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retryDelaysMs = options.retryDelaysMs ? [...options.retryDelaysMs] : [...DEFAULT_RETRY_DELAYS_MS];
    this.maxRetryAfterMs = options.maxRetryAfterMs ?? DEFAULT_MAX_RETRY_AFTER_MS;
    this.parser = options.parser ?? defaultLuoguParser;
    this.sleep = options.sleep ?? delay;
  }

  async searchProblems(options: SearchProblemsQuery): Promise<SearchResults<ProblemSummary>> {
    const keyword = validateNonEmpty(options.keyword, "keyword");
    const params = new URLSearchParams({
      type: "P",
      keyword,
    });
    const page = normalizePositiveInteger(options.page);
    if (page) {
      params.set("page", String(page));
    }
    for (const tagId of normalizePositiveIntegers(options.tagIds)) {
      params.append("tag", String(tagId));
    }

    const url = `${this.baseUrl}/problem/list?${params.toString()}`;
    const payload = await this.getPayload(url, {
      "x-lentille-request": "content-only",
    });
    try {
      return this.parser.parseProblemSearch(payload);
    } catch (error) {
      throw toClientErrorFromPayload(error, url);
    }
  }

  async fetchProblem(pid: string): Promise<ProblemRecord> {
    const normalizedPid = normalizeProblemId(validateNonEmpty(pid, "pid"));
    const url = `${this.baseUrl}/problem/${encodeURIComponent(normalizedPid)}`;
    const payload = await this.getPayload(url, {
      "x-lentille-request": "content-only",
    });
    try {
      return this.parser.parseProblem(payload);
    } catch (error) {
      throw toClientErrorFromPayload(error, url);
    }
  }

  async searchProblemSets(options: SearchProblemSetsQuery): Promise<SearchResults<ProblemSetSummary>> {
    const keyword = validateNonEmpty(options.keyword, "keyword");
    const params = new URLSearchParams({
      keyword,
    });
    const page = normalizePositiveInteger(options.page);
    if (page) {
      params.set("page", String(page));
    }
    if (options.type) {
      params.set("type", options.type);
    }

    const url = `${this.baseUrl}/training/list?${params.toString()}`;
    const payload = await this.getPayload(url, {
      "x-lentille-request": "content-only",
    });
    try {
      return this.parser.parseProblemSetSearch(payload);
    } catch (error) {
      throw toClientErrorFromPayload(error, url);
    }
  }

  async fetchProblemSet(id: string): Promise<ProblemSetRecord> {
    const normalizedId = validateNonEmpty(id, "id");
    const url = `${this.baseUrl}/training/${encodeURIComponent(normalizedId)}`;
    const payload = await this.getPayload(url, {
      "x-lentille-request": "content-only",
    });
    try {
      return this.parser.parseProblemSet(payload, normalizedId);
    } catch (error) {
      throw toClientErrorFromPayload(error, url);
    }
  }

  async fetchUserProfile(uid: number): Promise<UserProfile> {
    let normalizedUid: number;
    try {
      normalizedUid = requirePositiveInteger(uid, "uid");
    } catch (error) {
      throw new LuoguClientError(
        "VALIDATION_ERROR",
        error instanceof Error ? error.message : "uid must be a positive integer.",
        { cause: error }
      );
    }

    const url = `${this.baseUrl}/user/${normalizedUid}?_contentOnly=1`;
    const payload = await this.getPayload(url, {
      "x-lentille-request": "content-only",
    });
    try {
      return this.parser.parseUserProfile(payload);
    } catch (error) {
      throw toClientErrorFromPayload(error, url);
    }
  }

  private async getPayload(url: string, headers: Record<string, string>): Promise<unknown> {
    let lastError: LuoguClientError | undefined;

    for (let attempt = 0; attempt <= this.retryDelaysMs.length; attempt += 1) {
      const controller = this.timeoutMs > 0 ? new AbortController() : undefined;
      let timedOut = false;
      const timer =
        controller && this.timeoutMs > 0
          ? setTimeout(() => {
              timedOut = true;
              controller.abort(new DOMException(`Luogu request timed out after ${this.timeoutMs}ms`, "TimeoutError"));
            }, this.timeoutMs)
          : undefined;

      try {
        const response = await this.fetchImpl(url, {
          headers: {
            accept: "application/json, text/plain, */*",
            referer: `${this.baseUrl}/`,
            "user-agent": this.userAgent,
            ...headers,
          },
          signal: controller?.signal,
        });

        if (!response.ok) {
          const retryable = isTransientStatus(response.status);
          const error = buildHttpError(response.status, url, retryable);
          if (retryable && attempt < this.retryDelaysMs.length) {
            lastError = error;
            const retryAfter = parseRetryAfterMs(response.headers?.get?.("retry-after"), this.maxRetryAfterMs);
            await this.sleep(retryAfter ?? this.retryDelaysMs[attempt]);
            continue;
          }
          throw error;
        }

        const rawText = typeof response.text === "function"
          ? await response.text()
          : JSON.stringify(await response.json());

        return this.parser.extractPayload(rawText, {
          contentType: response.headers?.get?.("content-type"),
          url: response.url || url,
        });
      } catch (error) {
        const clientError = normalizeAttemptError(error, url, timedOut, this.timeoutMs);
        lastError = clientError;
        if (attempt >= this.retryDelaysMs.length || !clientError.retryable) {
          throw clientError;
        }
        await this.sleep(this.retryDelaysMs[attempt]);
      } finally {
        if (timer !== undefined) {
          clearTimeout(timer);
        }
      }
    }

    throw lastError ?? new LuoguClientError("NETWORK_ERROR", `Luogu request failed for ${url}`, { url });
  }
}

function validateNonEmpty(value: string, name: string): string {
  try {
    return requireNonEmpty(value, name);
  } catch (error) {
    throw new LuoguClientError(
      "VALIDATION_ERROR",
      error instanceof Error ? error.message : `${name} is required.`,
      { cause: error }
    );
  }
}

function buildHttpError(status: number, url: string, retryable: boolean): LuoguClientError {
  const message = `Luogu request failed: HTTP ${status} for ${url}`;
  if (status === 404) {
    return new LuoguClientError("NOT_FOUND", message, { status, url, retryable: false });
  }
  if (status === 401 || status === 403) {
    return new LuoguClientError("AUTH_REQUIRED", message, { status, url, retryable: false });
  }
  return new LuoguClientError("HTTP_ERROR", message, { status, url, retryable });
}

function normalizeAttemptError(error: unknown, url: string, timedOut: boolean, timeoutMs: number): LuoguClientError {
  if (error instanceof LuoguClientError) {
    return error;
  }
  if (timedOut || (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError"))) {
    return new LuoguClientError(
      "TIMEOUT",
      timedOut ? `Luogu request timed out after ${timeoutMs}ms for ${url}` : error instanceof Error ? error.message : `Request aborted for ${url}`,
      { url, retryable: true, cause: error }
    );
  }
  if (isPayloadErrorLike(error)) {
    return toClientErrorFromPayload(error, url);
  }
  if (isTransientNetworkError(error)) {
    return new LuoguClientError(
      "NETWORK_ERROR",
      error instanceof Error ? error.message : String(error),
      { url, retryable: true, cause: error }
    );
  }
  return new LuoguClientError(
    "NETWORK_ERROR",
    error instanceof Error ? error.message : String(error),
    { url, retryable: false, cause: error }
  );
}

function isPayloadErrorLike(error: unknown): boolean {
  return error instanceof Error && error.name === "LuoguPayloadError";
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  if (error instanceof TypeError || error.message === "fetch failed" || error.name === "AbortError" || error.name === "TimeoutError") {
    return true;
  }
  const transientCodes = [
    "ECONNRESET",
    "ETIMEDOUT",
    "EAI_AGAIN",
    "ENOTFOUND",
    "ECONNREFUSED",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_HEADERS_TIMEOUT",
  ];
  const code = (error as { code?: unknown }).code;
  const causeCode = (error as { cause?: { code?: unknown } }).cause?.code;
  return (
    (typeof code === "string" && transientCodes.includes(code)) ||
    (typeof causeCode === "string" && transientCodes.includes(causeCode))
  );
}

function parseRetryAfterMs(headerValue: string | null | undefined, maxMs: number): number | undefined {
  if (!headerValue) {
    return undefined;
  }
  const seconds = Number(headerValue.trim());
  if (!Number.isFinite(seconds) || seconds < 0) {
    return undefined;
  }
  return Math.min(Math.round(seconds * 1000), maxMs);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
