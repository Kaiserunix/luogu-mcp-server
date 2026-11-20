const LUOGU_URL_PROBLEM_RE = /luogu\.com\.cn\/problem\/([A-Za-z0-9_]+)/i;
const STRICT_PROBLEM_ID_RE = /^(?:[PBTU]\d+|CF\d+[A-Z]\d*|SP\d+|UVA\d+|AT_[A-Za-z0-9_]+)$/i;
const EMBEDDED_PROBLEM_ID_RE = /\b(?:P\d+|B\d+)\b/i;

/** Ensure a string input is non-empty after trimming. */
export function requireNonEmpty(value: string, name: string): string {
  if (typeof value !== "string") {
    throw new Error(`${name} is required.`);
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${name} is required.`);
  }
  return normalized;
}

/** Validate that a numeric input is a positive integer (>= 1). */
export function requirePositiveInteger(value: number, name: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
}

/** Normalize an optional positive integer, ignoring invalid or non-positive numbers. */
export function normalizePositiveInteger(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const floored = Math.floor(value);
  return floored >= 1 ? floored : undefined;
}

/** Deduplicate and normalize an optional list of positive integers. */
export function normalizePositiveIntegers(values: number[] | undefined): number[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return [
    ...new Set(
      values
        .map(normalizePositiveInteger)
        .filter((value): value is number => typeof value === "number")
    ),
  ];
}

/** Normalize a 1-based page number, defaulting invalid values to 1. */
export function normalizePage(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }
  return Math.max(1, Math.floor(value));
}

/** Clamp an optional limit into [1, max], falling back when invalid or omitted. */
export function normalizeLimit(value: number | undefined, fallback: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(1, Math.min(Math.floor(value), max));
}

/** Trim text to at most maxChars characters. */
export function trimText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(0, maxChars);
}

/** Normalize a Luogu problem identifier, preserving case for AtCoder AT_* suffixes. */
export function normalizeProblemId(pid: string): string {
  const trimmed = pid.trim();
  if (/^at_/i.test(trimmed)) {
    return `AT_${trimmed.slice(3)}`;
  }
  return trimmed.toUpperCase();
}

/** Extract a Luogu problem id from a Luogu URL, bare pid, or sentence containing a pid. */
export function extractProblemId(query: string): string | undefined {
  const trimmed = query.trim();
  if (!trimmed) {
    return undefined;
  }

  const urlMatch = trimmed.match(LUOGU_URL_PROBLEM_RE);
  if (urlMatch?.[1] && STRICT_PROBLEM_ID_RE.test(urlMatch[1])) {
    return normalizeProblemId(urlMatch[1]);
  }

  if (STRICT_PROBLEM_ID_RE.test(trimmed)) {
    return normalizeProblemId(trimmed);
  }

  const embeddedMatch = trimmed.match(EMBEDDED_PROBLEM_ID_RE);
  if (embeddedMatch?.[0]) {
    return normalizeProblemId(embeddedMatch[0]);
  }

  return undefined;
}
