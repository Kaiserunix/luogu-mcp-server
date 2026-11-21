export interface ProblemSample {
  input: string;
  output: string;
}

export interface ProblemRecord {
  platform: "luogu";
  id: string;
  title: string;
  sourceUrl: string;
  difficulty?: number;
  tags: string[];
  statement: string;
  inputFormat: string;
  outputFormat: string;
  samples: ProblemSample[];
  hint?: string;
}

export interface ProblemSummary {
  platform: "luogu";
  id: string;
  title: string;
  sourceUrl: string;
  difficulty?: number;
  tags: string[];
  reason?: string;
}

export interface ProblemSetSummary {
  id: string;
  title: string;
  sourceUrl: string;
  problemCount: number;
}

export interface ProblemSetRecord {
  platform: "luogu";
  id: string;
  title: string;
  sourceUrl: string;
  description: string;
  problemCount: number;
  problems: ProblemSummary[];
}

export interface SearchResults<T> {
  total: number;
  items: T[];
}

export interface UserProfile {
  uid: number;
  name: string;
  sourceUrl: string;
  avatar?: string;
  slogan?: string;
  badge?: string;
  color?: string;
  followingCount?: number;
  followerCount?: number;
  ranking?: number;
  passedProblemCount?: number | null;
  submittedProblemCount?: number | null;
  registerTime?: number;
  introduction?: string;
  guRating?: number;
  guScores?: Record<string, number>;
}

export interface SearchProblemsQuery {
  keyword: string;
  page?: number;
  tagIds?: number[];
}

export type ProblemSetSearchType = "official" | "select";

export interface SearchProblemSetsQuery {
  keyword: string;
  page?: number;
  type?: ProblemSetSearchType;
}

export interface LuoguGateway {
  searchProblems(options: SearchProblemsQuery): Promise<SearchResults<ProblemSummary>>;
  fetchProblem(pid: string): Promise<ProblemRecord>;
  searchProblemSets(options: SearchProblemSetsQuery): Promise<SearchResults<ProblemSetSummary>>;
  fetchProblemSet(id: string): Promise<ProblemSetRecord>;
  fetchUserProfile(uid: number): Promise<UserProfile>;
}

export interface RawResponseMetadata {
  contentType?: string | null;
  url?: string;
}

export interface LuoguParser {
  extractPayload(rawText: string, metadata?: RawResponseMetadata): unknown;
  parseProblem(payload: unknown): ProblemRecord;
  parseProblemSearch(payload: unknown): SearchResults<ProblemSummary>;
  parseProblemSetSearch(payload: unknown): SearchResults<ProblemSetSummary>;
  parseProblemSet(payload: unknown, idHint: string): ProblemSetRecord;
  parseUserProfile(payload: unknown): UserProfile;
}

export interface CacheStats {
  hits: number;
  misses: number;
  coalesced: number;
  size: number;
}
