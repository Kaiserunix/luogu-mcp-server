import type {
  LuoguParser,
  ProblemRecord,
  ProblemSample,
  ProblemSetRecord,
  ProblemSetSummary,
  ProblemSummary,
  RawResponseMetadata,
  SearchResults,
  UserProfile,
} from "../types.js";
import { LuoguPayloadError } from "./errors.js";
import { extractLentillePayload } from "./lentilleExtractor.js";

/** Normalize a Luogu problem detail payload into a canonical ProblemRecord. */
export function normalizeProblemPayload(payload: unknown): ProblemRecord {
  const data = extractPayloadData(payload);
  const problem = asRecord(data?.problem);
  const content = asRecord(problem?.content);
  const contenu = asRecord(problem?.contenu);
  const pid = asString(problem?.pid).trim();
  const title =
    asString(problem?.title) ||
    asString(problem?.name) ||
    asString(content?.name) ||
    asString(contenu?.name);

  if (!problem || !pid || !title) {
    throw new LuoguPayloadError("INVALID_PAYLOAD", "Luogu response did not include a usable problem payload.");
  }

  return {
    platform: "luogu",
    id: pid,
    title,
    sourceUrl: problemUrl(pid),
    difficulty: asOptionalNumber(problem.difficulty),
    tags: normalizeTags(problem.tags),
    statement:
      joinProblemSections(asString(content?.background), asString(content?.description)) ||
      joinProblemSections(asString(contenu?.background), asString(contenu?.description)) ||
      asString(problem.description),
    inputFormat: asString(problem.inputFormat) || asString(content?.formatI) || asString(contenu?.formatI),
    outputFormat: asString(problem.outputFormat) || asString(content?.formatO) || asString(contenu?.formatO),
    samples: normalizeSamples(problem.samples),
    hint: asString(problem.hint) || asString(content?.hint) || asString(contenu?.hint),
  };
}

/** Normalize a Luogu problem list search payload into SearchResults<ProblemSummary>. */
export function normalizeProblemSearchPayload(payload: unknown): SearchResults<ProblemSummary> {
  const data = extractPayloadData(payload);
  const problems = asRecord(data?.problems);
  const rawItems = problems?.result;
  const items = Array.isArray(rawItems)
    ? rawItems
        .map((item) => normalizeProblemSummary(item, false))
        .filter((item): item is ProblemSummary => Boolean(item))
    : [];

  return {
    total: asCount(problems?.count, items.length),
    items,
  };
}

/** Normalize a Luogu training list search payload into SearchResults<ProblemSetSummary>. */
export function normalizeProblemSetSearchPayload(payload: unknown): SearchResults<ProblemSetSummary> {
  const data = extractPayloadData(payload);
  const trainings = asRecord(data?.trainings);
  const rawItems = trainings?.result;
  const items = Array.isArray(rawItems)
    ? rawItems
        .map((item): ProblemSetSummary | undefined => {
          const record = asRecord(item);
          if (!record) {
            return undefined;
          }
          const id =
            typeof record.id === "number" && Number.isFinite(record.id)
              ? String(record.id)
              : typeof record.id === "string"
                ? record.id.trim()
                : "";
          const title = asString(record.title) || asString(record.name);
          if (!id || !title) {
            return undefined;
          }

          return {
            id,
            title,
            sourceUrl: trainingUrl(id),
            problemCount: asOptionalNumber(record.problemCount) ?? 0,
          };
        })
        .filter((item): item is ProblemSetSummary => Boolean(item))
    : [];

  return {
    total: asCount(trainings?.count, items.length),
    items,
  };
}

/** Normalize a Luogu training detail payload into a canonical ProblemSetRecord. */
export function normalizeProblemSetPayload(payload: unknown, idHint: string): ProblemSetRecord {
  const data = extractPayloadData(payload);
  const training = asRecord(data?.training);
  if (!training) {
    throw new LuoguPayloadError("INVALID_PAYLOAD", "Luogu response did not include a usable problem set payload.");
  }

  const hasTrainingIdentity =
    (typeof training.id === "number" && Number.isFinite(training.id)) ||
    (typeof training.id === "string" && training.id.trim().length > 0) ||
    Boolean(asString(training.title) || asString(training.name) || Array.isArray(training.problems));
  if (!hasTrainingIdentity) {
    throw new LuoguPayloadError("INVALID_PAYLOAD", "Luogu response did not include a usable problem set payload.");
  }

  const id =
    typeof training.id === "number" && Number.isFinite(training.id)
      ? String(training.id)
      : typeof training.id === "string" && training.id.trim().length > 0
        ? training.id.trim()
        : idHint;
  const title = asString(training.title) || asString(training.name) || `Luogu training ${id}`;
  const problems = Array.isArray(training.problems)
    ? training.problems
        .map((item) => normalizeProblemSummary(item, true))
        .filter((item): item is ProblemSummary => Boolean(item))
    : [];

  return {
    platform: "luogu",
    id,
    title,
    sourceUrl: trainingUrl(id),
    description: asString(training.description),
    problemCount: asOptionalNumber(training.problemCount) ?? problems.length,
    problems,
  };
}

/** Normalize a Luogu public user profile payload into a canonical UserProfile. */
export function normalizeUserProfilePayload(payload: unknown): UserProfile {
  const data = extractPayloadData(payload);
  const user = asRecord(data?.user);
  const gu = asRecord(data?.gu);
  if (!user || typeof user.uid !== "number" || !Number.isFinite(user.uid) || typeof user.name !== "string" || !user.name) {
    throw new LuoguPayloadError("INVALID_PAYLOAD", "Luogu response did not include a usable user profile payload.");
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
    guRating: asOptionalNumber(gu?.rating),
    guScores: normalizeScoreRecord(gu?.scores),
  };
}

/** Default parser adapter implementing LuoguParser for LuoguClient. */
export class DefaultLuoguParser implements LuoguParser {
  extractPayload(rawText: string, metadata?: RawResponseMetadata): unknown {
    return extractLentillePayload(rawText, metadata);
  }

  parseProblem(payload: unknown): ProblemRecord {
    return normalizeProblemPayload(payload);
  }

  parseProblemSearch(payload: unknown): SearchResults<ProblemSummary> {
    return normalizeProblemSearchPayload(payload);
  }

  parseProblemSetSearch(payload: unknown): SearchResults<ProblemSetSummary> {
    return normalizeProblemSetSearchPayload(payload);
  }

  parseProblemSet(payload: unknown, idHint: string): ProblemSetRecord {
    return normalizeProblemSetPayload(payload, idHint);
  }

  parseUserProfile(payload: unknown): UserProfile {
    return normalizeUserProfilePayload(payload);
  }
}

export const defaultLuoguParser: LuoguParser = new DefaultLuoguParser();

function extractPayloadData(payload: unknown): Record<string, unknown> | undefined {
  const root = asRecord(payload);
  if (!root) {
    return undefined;
  }
  return asRecord(root.data) ?? asRecord(root.currentData);
}

function normalizeProblemSummary(item: unknown, unwrapNested: boolean): ProblemSummary | undefined {
  const outer = asRecord(item);
  if (!outer) {
    return undefined;
  }

  const record = unwrapNested && asRecord(outer.problem) ? asRecord(outer.problem)! : outer;
  const pid = asString(record.pid).trim();
  const title = asString(record.title) || asString(record.name);
  if (!pid || !title) {
    return undefined;
  }

  return {
    platform: "luogu",
    id: pid,
    title,
    sourceUrl: problemUrl(pid),
    difficulty: asOptionalNumber(record.difficulty),
    tags: normalizeTags(record.tags),
  };
}

function normalizeSamples(value: unknown): ProblemSample[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((sample): ProblemSample | undefined => {
      if (Array.isArray(sample)) {
        if (sample.length < 2) {
          return undefined;
        }
        return { input: asTextValue(sample[0]), output: asTextValue(sample[1]) };
      }

      const record = asRecord(sample);
      if (record && ("input" in record || "output" in record)) {
        return { input: asTextValue(record.input), output: asTextValue(record.output) };
      }

      return undefined;
    })
    .filter((sample): sample is ProblemSample => Boolean(sample));
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const tags: string[] = [];
  for (const tag of value) {
    if (typeof tag === "string") {
      if (tag.trim()) {
        tags.push(tag);
      }
      continue;
    }
    if (typeof tag === "number" && Number.isFinite(tag)) {
      tags.push(String(tag));
      continue;
    }
    const record = asRecord(tag);
    if (record) {
      const label = asString(record.name) || (typeof record.id === "number" && Number.isFinite(record.id) ? String(record.id) : asString(record.id));
      if (label) {
        tags.push(label);
      }
    }
  }
  return tags;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asTextValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asOptionalNullableNumber(value: unknown): number | null | undefined {
  if (value === null) {
    return null;
  }
  return asOptionalNumber(value);
}

function normalizeScoreRecord(value: unknown): Record<string, number> | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const entries = Object.entries(record).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1])
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function asCount(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function joinProblemSections(...sections: string[]): string {
  return sections
    .map((section) => section.trim())
    .filter((section) => section.length > 0)
    .join("\n\n");
}

function problemUrl(pid: string): string {
  return `https://www.luogu.com.cn/problem/${pid}`;
}

function trainingUrl(id: string): string {
  return `https://www.luogu.com.cn/training/${id}`;
}
