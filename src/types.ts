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
