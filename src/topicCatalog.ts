export interface LuoguAlgorithmTopic {
  name: string;
  aliases: string[];
  queries: string[];
  tagIds?: number[];
  painPoints?: string[];
}

const CORE_TOPICS: LuoguAlgorithmTopic[] = [
  { name: "树", aliases: ["tree"], queries: ["树"], tagIds: [11] },
  { name: "二叉树", aliases: ["binary tree", "binary_tree"], queries: ["二叉树"], tagIds: [11] },
  { name: "最短路", aliases: ["shortest path", "SPFA", "Dijkstra", "Floyd"], queries: ["最短路", "SPFA", "Dijkstra", "Floyd"] },
  { name: "Dijkstra", aliases: [], queries: ["Dijkstra", "最短路"] },
  { name: "Floyd", aliases: [], queries: ["Floyd", "最短路"] },
  { name: "SPFA", aliases: [], queries: ["SPFA", "最短路"] },
  { name: "最小生成树", aliases: ["MST", "Prim", "Kruskal"], queries: ["最小生成树", "Prim", "Kruskal"] },
  { name: "Kruskal", aliases: [], queries: ["Kruskal", "最小生成树"] },
  { name: "Prim", aliases: [], queries: ["Prim", "最小生成树"] },
  { name: "平衡树", aliases: ["Treap", "Splay"], queries: ["平衡树", "Treap", "Splay"] },
  { name: "Treap", aliases: [], queries: ["Treap", "平衡树"] },
  { name: "Splay", aliases: [], queries: ["Splay", "平衡树"] },
  { name: "状态压缩", aliases: ["状压", "state compression"], queries: ["状压", "状态压缩"] },
  { name: "动态规划", aliases: ["DP", "dynamic programming"], queries: ["动态规划", "DP"] },
  { name: "线性DP", aliases: ["线性 DP"], queries: ["线性 DP", "线性DP"] },
  { name: "区间DP", aliases: ["区间 DP"], queries: ["区间 DP", "区间DP"] },
  { name: "树形DP", aliases: ["树形 DP"], queries: ["树形 DP", "树形DP"] },
  { name: "数位DP", aliases: ["数位 DP"], queries: ["数位 DP", "数位DP"] },
  { name: "期望DP", aliases: ["期望 DP"], queries: ["期望 DP", "期望DP"] },
  { name: "AC自动机", aliases: ["AC 自动机"], queries: ["AC 自动机", "AC自动机"] },
  { name: "Bellman-Ford", aliases: ["Bellman Ford"], queries: ["Bellman Ford", "Bellman-Ford", "最短路"] },
  { name: "桥", aliases: ["割边"], queries: ["桥", "割边"] },
  { name: "匈牙利算法", aliases: ["匈牙利"], queries: ["匈牙利", "匈牙利算法"] },
  { name: "2-SAT", aliases: ["2SAT"], queries: ["2-SAT", "2SAT"] },
  { name: "CDQ分治", aliases: ["CDQ 分治"], queries: ["CDQ 分治", "CDQ分治"] }
];

const COVERAGE_TOPICS = [
  "模拟",
  "枚举",
  "贪心",
  "排序",
  "二分",
  "前缀和",
  "差分",
  "双指针",
  "滑动窗口",
  "哈希",
  "字符串",
  "KMP",
  "Manacher",
  "字典树",
  "Trie",
  "后缀数组",
  "后缀自动机",
  "数学",
  "数论",
  "质数",
  "筛法",
  "欧拉函数",
  "快速幂",
  "矩阵快速幂",
  "组合数学",
  "容斥",
  "博弈论",
  "概率",
  "高精度",
  "位运算",
  "背包",
  "斜率优化",
  "单调队列优化",
  "图论",
  "拓扑排序",
  "强连通分量",
  "Tarjan",
  "割点",
  "双连通分量",
  "二分图",
  "网络流",
  "最大流",
  "最小割",
  "费用流",
  "差分约束",
  "LCA",
  "树链剖分",
  "树的直径",
  "树的重心",
  "并查集",
  "线段树",
  "树状数组",
  "主席树",
  "可持久化线段树",
  "分块",
  "莫队",
  "单调栈",
  "单调队列",
  "堆",
  "优先队列",
  "递归",
  "DFS",
  "BFS",
  "回溯",
  "搜索",
  "剪枝",
  "记忆化搜索",
  "计算几何",
  "凸包",
  "扫描线",
  "多项式",
  "FFT",
  "NTT",
  "线性基",
  "点分治"
];

export const ALGORITHM_TOPICS: LuoguAlgorithmTopic[] = mergeTopics([
  ...CORE_TOPICS,
  ...COVERAGE_TOPICS.map((name) => ({ name, aliases: [], queries: [name] }))
]);

export function listAlgorithmTopics(): LuoguAlgorithmTopic[] {
  return ALGORITHM_TOPICS.map((topic) => ({
    ...topic,
    aliases: [...topic.aliases],
    queries: [...topic.queries],
    tagIds: topic.tagIds ? [...topic.tagIds] : undefined,
    painPoints: topic.painPoints ? [...topic.painPoints] : undefined
  }));
}

export function findTopic(query: string): LuoguAlgorithmTopic | undefined {
  const normalized = normalize(query);
  return (
    ALGORITHM_TOPICS.find((topic) => normalize(topic.name) === normalized) ??
    ALGORITHM_TOPICS.find((topic) => topic.aliases.some((alias) => normalize(alias) === normalized))
  );
}

export function topicQueriesFor(query: string): string[] {
  const trimmed = query.trim();
  const topic = findTopic(trimmed);
  if (!topic) {
    return trimmed ? [trimmed] : [];
  }

  return unique([trimmed, ...topic.queries]);
}

function mergeTopics(topics: LuoguAlgorithmTopic[]): LuoguAlgorithmTopic[] {
  const byName = new Map<string, LuoguAlgorithmTopic>();
  for (const topic of topics) {
    if (!byName.has(topic.name)) {
      byName.set(topic.name, topic);
    }
  }
  return [...byName.values()];
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
