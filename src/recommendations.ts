import type { ProblemSummary } from "./types.js";

export interface RecommendProblemsInput {
  topic?: string;
  painPoint?: string;
  currentProblemId?: string;
  limit?: number;
}

export interface RecommendProblemsResult {
  topic?: string;
  painPoint?: string;
  searchHints: string[];
  items: ProblemSummary[];
}

interface Bucket {
  aliases: string[];
  hints: string[];
  ids: string[];
}

const PROBLEMS: Record<string, ProblemSummary> = {
  P1205: problem("P1205", "[USACO1.2] Transformations", ["simulation", "matrix"], "Practice matrix transformation classification."),
  P1305: problem("P1305", "新二叉树", ["binary-tree", "traversal"], "Practice reading child triples and direct preorder traversal."),
  P1030: problem("P1030", "[NOIP 2001 普及组] 求先序排列", ["binary-tree", "traversal", "reconstruction"], "Practice reconstructing preorder from inorder and postorder."),
  P1827: problem("P1827", "[USACO3.4] 美国血统 American Heritage", ["binary-tree", "traversal", "reconstruction"], "Practice named-node traversal reconstruction."),
  P1229: problem("P1229", "遍历问题", ["binary-tree", "traversal", "counting"], "Practice ambiguous traversal reasoning."),
  P4913: problem("P4913", "【深基16.例3】二叉树深度", ["binary-tree", "recursion"], "Practice child indexing and recursive depth."),
  P1364: problem("P1364", "医院设置", ["tree", "distance", "weighted-cost"], "Practice weighted tree distances and root candidates."),
  P3884: problem("P3884", "[JLOI2009] 二叉树问题", ["binary-tree", "distance"], "Practice depth, width, and distance queries."),
  P1185: problem("P1185", "绘制二叉树", ["binary-tree", "output-format"], "Practice recursive layout and strict formatting."),
  P1427: problem("P1427", "小鱼的数字游戏", ["array", "sentinel-input", "output-order"], "Practice sentinel input and reversed output."),
  P5731: problem("P5731", "【深基5.习6】蛇形方阵", ["matrix", "simulation", "output-format"], "Practice matrix traversal and row formatting."),
  P5730: problem("P5730", "【深基5.例10】显示屏", ["simulation", "output-format"], "Practice fixed-width rendering."),
  P5727: problem("P5727", "【深基5.例3】冰雹猜想", ["sequence", "output-order"], "Practice sequence generation and reversed reporting.")
};

const BUCKETS: Bucket[] = [
  bucket(["binary_tree", "binary-tree", "二叉树", "traversal_order_confusion", "wrong_traversal_order"], ["二叉树 遍历", "先序 中序 后序"], [
    "P1305",
    "P1030",
    "P1827",
    "P1229"
  ]),
  bucket(["tree_distance", "weighted_cost", "树距离", "换根"], ["树 距离", "加权距离"], ["P1364", "P3884", "P4913"]),
  bucket(["recursion_base_case", "depth_definition", "child_indexing", "递归", "深度"], ["递归 二叉树 深度", "子节点 编号"], [
    "P4913",
    "P1305",
    "P1030"
  ]),
  bucket(["output_order", "sentinel_input", "输出顺序", "哨兵输入"], ["倒序输出", "哨兵输入"], ["P1427", "P5727", "P5731"]),
  bucket(["output_format", "format", "格式"], ["输出格式", "字符画"], ["P5731", "P5730", "P1185"]),
  bucket(["matrix", "simulation", "矩阵", "模拟"], ["矩阵 模拟", "方阵"], ["P1205", "P5731", "P5730"])
];

export function recommendProblems(input: RecommendProblemsInput): RecommendProblemsResult {
  const topic = normalizeKey(input.topic);
  const painPoint = normalizeKey(input.painPoint);
  const currentProblemId = input.currentProblemId?.trim().toUpperCase();
  const limit = normalizeLimit(input.limit, 5, 10);
  const selected = findBucket(topic) ?? findBucket(painPoint);
  const items =
    selected?.ids
      .map((id) => PROBLEMS[id])
      .filter((item): item is ProblemSummary => Boolean(item))
      .filter((item) => item.id !== currentProblemId)
      .slice(0, limit) ?? [];
  const searchHints = selected?.hints ?? [input.topic, input.painPoint].filter((value): value is string => Boolean(value?.trim()));

  return {
    topic: input.topic,
    painPoint: input.painPoint,
    searchHints,
    items
  };
}

function findBucket(key: string | undefined): Bucket | undefined {
  if (!key) {
    return undefined;
  }

  return BUCKETS.find((bucket) => bucket.aliases.some((alias) => normalizeKey(alias) === key));
}

function bucket(aliases: string[], hints: string[], ids: string[]): Bucket {
  return { aliases, hints, ids };
}

function problem(id: string, title: string, tags: string[], reason: string): ProblemSummary {
  return {
    platform: "luogu",
    id,
    title,
    sourceUrl: `https://www.luogu.com.cn/problem/${id}`,
    tags,
    reason
  };
}

function normalizeKey(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase().replace(/[-\s]+/g, "_");
  return normalized || undefined;
}

function normalizeLimit(value: number | undefined, fallback: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.min(Math.floor(value), max));
}
