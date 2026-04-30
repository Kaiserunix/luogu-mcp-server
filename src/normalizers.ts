import type {
  ProblemRecord,
  ProblemSample,
  ProblemSetRecord,
  ProblemSetSummary,
  ProblemSummary,
  SearchResults,
  UserProfile
} from "./types.js";

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
      content?: ProblemContentPayload;
      contenu?: ProblemContentPayload;
    };
  };
}

interface ProblemContentPayload {
  description?: unknown;
  formatI?: unknown;
  formatO?: unknown;
  hint?: unknown;
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

interface UserProfilePayload {
  data?: {
    gu?: {
      rating?: unknown;
      scores?: unknown;
    };
    user?: {
      uid?: unknown;
      name?: unknown;
      avatar?: unknown;
      slogan?: unknown;
      badge?: unknown;
      color?: unknown;
      followingCount?: unknown;
      followerCount?: unknown;
      ranking?: unknown;
      passedProblemCount?: unknown;
      submittedProblemCount?: unknown;
      registerTime?: unknown;
      introduction?: unknown;
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
    statement: asString(problem.description) || asString(problem.content?.description) || asString(problem.contenu?.description),
    inputFormat: asString(problem.inputFormat) || asString(problem.content?.formatI) || asString(problem.contenu?.formatI),
    outputFormat: asString(problem.outputFormat) || asString(problem.content?.formatO) || asString(problem.contenu?.formatO),
    samples: normalizeSamples(problem.samples),
    hint: asString(problem.hint) || asString(problem.content?.hint) || asString(problem.contenu?.hint)
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

export function normalizeUserProfilePayload(payload: unknown): UserProfile {
  const source = payload as UserProfilePayload;
  const user = source.data?.user;
  if (!user || typeof user.uid !== "number" || typeof user.name !== "string") {
    throw new Error("Luogu response did not include a usable user profile payload.");
  }

  return {
    uid: user.uid,
    name: user.name,
    sourceUrl: `https://www.luogu.com.cn/user/${user.uid}`,
    avatar: asOptionalString(user.avatar),
    slogan: asOptionalString(user.slogan),
    badge: asOptionalString(user.badge),
    color: asOptionalString(user.color),
    followingCount: asOptionalNumber(user.followingCount),
    followerCount: asOptionalNumber(user.followerCount),
    ranking: asOptionalNumber(user.ranking),
    passedProblemCount: asOptionalNullableNumber(user.passedProblemCount),
    submittedProblemCount: asOptionalNullableNumber(user.submittedProblemCount),
    registerTime: asOptionalNumber(user.registerTime),
    introduction: asOptionalString(user.introduction),
    guRating: asOptionalNumber(source.data?.gu?.rating),
    guScores: normalizeScoreRecord(source.data?.gu?.scores)
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

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function asOptionalNullableNumber(value: unknown): number | null | undefined {
  if (value === null) {
    return null;
  }

  return asOptionalNumber(value);
}

function normalizeScoreRecord(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const entries = Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, number] => typeof entry[1] === "number");
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
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
