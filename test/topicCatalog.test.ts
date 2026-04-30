import { describe, expect, test } from "vitest";
import { findTopic, listAlgorithmTopics, topicQueriesFor } from "../src/topicCatalog.js";

describe("Luogu topic catalog", () => {
  test("normalizes English aliases to Chinese search queries", () => {
    expect(topicQueriesFor("SPFA")).toEqual(["SPFA", "最短路"]);
    expect(topicQueriesFor("Prim")).toEqual(["Prim", "最小生成树"]);
    expect(topicQueriesFor("Treap")).toEqual(["Treap", "平衡树"]);
  });

  test("keeps known Luogu tag ids on catalog entries", () => {
    expect(findTopic("二叉树")?.tagIds).toEqual([11]);
    expect(findTopic("树")?.tagIds).toEqual([11]);
  });

  test("lists stable topic metadata for MCP clients", () => {
    const topics = listAlgorithmTopics();
    expect(topics.length).toBeGreaterThanOrEqual(100);
    expect(topics.find((topic) => topic.name === "最短路")?.aliases).toContain("SPFA");
  });
});
