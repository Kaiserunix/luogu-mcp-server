import type { ProblemRecord, ProblemSample, ProblemSetRecord, ProblemSetSummary, ProblemSummary, SearchResults } from "./types.js";

interface ProblemPayload {
  data?: {
    problem?: {
      pid?: unknown;
      title?: unknown;
      difficulty?: unknown;
      tags?: unknown;
      description?: unknown;
      inputFormat?: unknown;
      outputFormat?: unknown;
      samples?: unknown;
      hint?: unknown;
    };
  };
}

interface ProblemSearchPayload {
  data?: {
    problems?: {
      count?: unknown;
      result?: unknown;
    };
  };
}

interface ProblemSetSearchPayload {
  currentData?: {
    trainings?: {
      count?: unknown;
      result?: unknown;
    };
  };
}

interface ProblemSetPayload {
  currentData?: {
    training?: {
      id?: unknown;
      title?: unknown;
      name?: unknown;
      description?: unknown;
      problemCount?: unknown;
      problems?: unknown;
    };
  };
}

export function normalizeProblemPayload(payload: unknown): ProblemRecord {
  const source = payload as ProblemPayload;
  const problem = source.data?.problem;
  if (!problem || typeof problem.pid !== "string" || typeof problem.title !== "string") {
    throw new Error("Luogu response did not include a usable problem payload.");
  }

  return {
    platform: "luogu",
    id: problem.pid,
    title: problem.title,
    sourceUrl: problemUrl(problem.pid),
    difficulty: asOptionalNumber(problem.difficulty),
    tags: normalizeTags(problem.tags),
    statement: asString(problem.description),
    inputFormat: asString(problem.inputFormat),
    outputFormat: asString(problem.outputFormat),
    samples: normalizeSamples(problem.samples),
    hint: asString(problem.hint)
  };
}

export function normalizeProblemSearchPayload(payload: unknown): SearchResults<ProblemSummary> {
  const source = payload as ProblemSearchPayload;
  const rawItems = source.data?.problems?.result;
  const items = Array.isArray(rawItems)
    ? rawItems
        .map((item): ProblemSummary | undefined => {
          if (!item || typeof item !== "object") {
            return undefined;
          }

          const record = item as Record<string, unknown>;
          if (typeof record.pid !== "string" || typeof record.title !== "string") {
            return undefined;
          }

          return {
            platform: "luogu",
            id: record.pid,
            title: record.title,
            sourceUrl: problemUrl(record.pid),
            difficulty: asOptionalNumber(record.difficulty),
            tags: normalizeTags(record.tags)
          };
        })
        .filter((item): item is ProblemSummary => Boolean(item))
    : [];

  return {
    total: asCount(source.data?.problems?.count, items.length),
    items
  };
}

export function normalizeProblemSetSearchPayload(payload: unknown): SearchResults<ProblemSetSummary> {
  const source = payload as ProblemSetSearchPayload;
  const rawItems = source.currentData?.trainings?.result;
  const items = Array.isArray(rawItems)
    ? rawItems
        .map((item): ProblemSetSummary | undefined => {
          if (!item || typeof item !== "object") {
            return undefined;
          }

          const record = item as Record<string, unknown>;
          const id = typeof record.id === "number" || typeof record.id === "string" ? String(record.id) : "";
          const title = typeof record.title === "string" ? record.title : typeof record.name === "string" ? record.name : "";
          if (!id || !title) {
            return undefined;
          }

          return {
            id,
            title,
            sourceUrl: trainingUrl(id),
            problemCount: typeof record.problemCount === "number" ? record.problemCount : 0
          };
        })
        .filter((item): item is ProblemSetSummary => Boolean(item))
    : [];

  return {
    total: asCount(source.currentData?.trainings?.count, items.length),
    items
  };
}

export function normalizeProblemSetPayload(payload: unknown, idHint: string): ProblemSetRecord {
  const source = payload as ProblemSetPayload;
  const training = source.currentData?.training;
  if (!training) {
    throw new Error("Luogu response did not include a usable problem set payload.");
  }

  const id = typeof training.id === "number" || typeof training.id === "string" ? String(training.id) : idHint;
  const title = asString(training.title) || asString(training.name) || `Luogu training ${id}`;
  const problems = normalizeProblemSetProblems(training.problems);

  return {
    platform: "luogu",
    id,
    title,
    sourceUrl: trainingUrl(id),
    description: asString(training.description),
    problemCount: typeof training.problemCount === "number" ? training.problemCount : problems.length,
    problems
  };
}

function normalizeProblemSetProblems(value: unknown): ProblemSummary[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): ProblemSummary | undefined => {
      const problem = item && typeof item === "object" ? (item as Record<string, unknown>).problem : undefined;
      if (!problem || typeof problem !== "object") {
        return undefined;
      }

      const record = problem as Record<string, unknown>;
      if (typeof record.pid !== "string" || typeof record.title !== "string") {
        return undefined;
      }

      return {
        platform: "luogu",
        id: record.pid,
        title: record.title,
        sourceUrl: problemUrl(record.pid),
        difficulty: asOptionalNumber(record.difficulty),
        tags: normalizeTags(record.tags)
      };
    })
    .filter((problem): problem is ProblemSummary => Boolean(problem));
}

function normalizeSamples(value: unknown): ProblemSample[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((sample): ProblemSample | undefined => {
      if (Array.isArray(sample)) {
        return { input: asString(sample[0]), output: asString(sample[1]) };
      }

      if (sample && typeof sample === "object") {
        const record = sample as Record<string, unknown>;
        return { input: asString(record.input), output: asString(record.output) };
      }

      return undefined;
    })
    .filter((sample): sample is ProblemSample => Boolean(sample));
}

function normalizeTags(value: unknown): string[] {
  return Array.isArray(value) ? value.map((tag) => String(tag)) : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function asCount(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function problemUrl(pid: string): string {
  return `https://www.luogu.com.cn/problem/${pid}`;
}

function trainingUrl(id: string): string {
  return `https://www.luogu.com.cn/training/${id}`;
}
