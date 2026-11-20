import type { RawResponseMetadata } from "../types.js";
import { LuoguPayloadError } from "./errors.js";

const LENTILLE_SCRIPT_RE =
  /<script\b[^>]*\bid=["']lentille-context["'][^>]*>([\s\S]*?)<\/script>/i;

/**
 * Extract a parsed JSON payload from either a direct JSON response or a Lentille SSR HTML page,
 * raising typed payload errors for redirects to login, anti-bot challenges, or malformed envelopes.
 */
export function extractLentillePayload(rawText: string, metadata?: RawResponseMetadata): unknown {
  const url = metadata?.url;
  if (url && /\/auth\/login(?:[/?#]|$)/i.test(url)) {
    throw new LuoguPayloadError("AUTH_REQUIRED", "Luogu redirected this request to login.", url);
  }

  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new LuoguPayloadError("INVALID_PAYLOAD", "Luogu returned an empty response body.", url);
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const parsed = parseJsonString(trimmed, url);
    assertValidEnvelope(parsed, url);
    return parsed;
  }

  const scriptMatch = trimmed.match(LENTILLE_SCRIPT_RE);
  const scriptJson = scriptMatch?.[1]?.trim();
  if (scriptJson) {
    const parsed = parseJsonString(scriptJson, url);
    assertValidEnvelope(parsed, url);
    return parsed;
  }

  if (looksLikeLoginHtml(trimmed)) {
    throw new LuoguPayloadError("AUTH_REQUIRED", "Luogu returned a login page instead of public content.", url);
  }

  if (looksLikeChallengeHtml(trimmed)) {
    throw new LuoguPayloadError("CHALLENGE_BLOCKED", "Luogu returned an anti-bot or Cloudflare challenge page.", url);
  }

  const contentType = metadata?.contentType ?? "";
  if (contentType.includes("application/json")) {
    const parsed = parseJsonString(trimmed, url);
    assertValidEnvelope(parsed, url);
    return parsed;
  }

  throw new LuoguPayloadError("INVALID_PAYLOAD", "Luogu response did not contain a Lentille JSON payload.", url);
}

function parseJsonString(text: string, url?: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new LuoguPayloadError(
      "INVALID_JSON",
      `Failed to parse Luogu JSON payload: ${error instanceof Error ? error.message : String(error)}`,
      url,
      { cause: error }
    );
  }
}

function assertValidEnvelope(payload: unknown, url?: string): void {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return;
  }

  const record = payload as Record<string, unknown>;
  const data = asRecord(record.data) ?? asRecord(record.currentData);
  const status = asFiniteNumber(record.code) ?? asFiniteNumber(record.status) ?? asFiniteNumber(data?.status);
  const errorMessage = asString(data?.errorMessage) || asString(record.errorMessage);
  const template = asString(record.currentTemplate);

  if (status === 404 || (template === "Error" && /not found|不存在/i.test(errorMessage))) {
    throw new LuoguPayloadError("NOT_FOUND", errorMessage || "Luogu resource not found.", url);
  }

  if (status === 401 || status === 403 || template === "Auth") {
    throw new LuoguPayloadError("AUTH_REQUIRED", errorMessage || "Luogu requires authentication for this resource.", url);
  }

  if ((typeof status === "number" && status >= 400) || (template === "Error" && errorMessage)) {
    throw new LuoguPayloadError("INVALID_PAYLOAD", errorMessage || `Luogu returned error status ${status ?? "unknown"}.`, url);
  }
}

function looksLikeLoginHtml(html: string): boolean {
  return (
    /\/auth\/login/i.test(html) ||
    /<title>[^<]*(?:登录|Login)[^<]*<\/title>/i.test(html)
  );
}

function looksLikeChallengeHtml(html: string): boolean {
  return (
    /cf-browser-verification|challenge-platform|__cf_chl_/i.test(html) ||
    /<title>\s*Just a moment\.\.\.\s*<\/title>/i.test(html)
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
