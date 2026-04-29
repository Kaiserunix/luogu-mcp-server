import { describe, expect, test } from "vitest";
import {
  normalizeProblemPayload,
  normalizeProblemSearchPayload,
  normalizeProblemSetPayload,
  normalizeProblemSetSearchPayload
} from "../src/normalizers.js";

describe("Luogu payload normalizers", () => {
  test("normalizes problem details", () => {
    const problem = normalizeProblemPayload({
      data: {
        problem: {
          pid: "P1305",
          title: "新二叉树",
          difficulty: 2,
          tags: [2, "tree"],
          description: "Build a tree.",
          inputFormat: "Input triples.",
          outputFormat: "Print preorder.",
          samples: [["abc", "abc"]],
          hint: "Binary tree"
        }
      }
    });

    expect(problem).toMatchObject({
      platform: "luogu",
      id: "P1305",
      title: "新二叉树",
      difficulty: 2,
      tags: ["2", "tree"],
      sourceUrl: "https://www.luogu.com.cn/problem/P1305"
    });
    expect(problem.samples).toEqual([{ input: "abc", output: "abc" }]);
  });

  test("normalizes problem search results", () => {
    const results = normalizeProblemSearchPayload({
      data: {
        problems: {
          count: 1,
          result: [{ pid: "P1030", title: "求先序排列", difficulty: 2, tags: [72] }]
        }
      }
    });

    expect(results.total).toBe(1);
    expect(results.items[0]).toEqual({
      platform: "luogu",
      id: "P1030",
      title: "求先序排列",
      difficulty: 2,
      tags: ["72"],
      sourceUrl: "https://www.luogu.com.cn/problem/P1030"
    });
  });

  test("normalizes training search and training details", () => {
    const search = normalizeProblemSetSearchPayload({
      currentData: {
        trainings: {
          count: 1,
          result: [{ id: 100, title: "【入门1】顺序结构", problemCount: 15 }]
        }
      }
    });
    const detail = normalizeProblemSetPayload(
      {
        currentData: {
          training: {
            id: 100,
            title: "【入门1】顺序结构",
            description: "Starter",
            problemCount: 1,
            problems: [{ problem: { pid: "P1001", title: "A+B Problem", difficulty: 1, tags: [1] } }]
          }
        }
      },
      "100"
    );

    expect(search.items[0].sourceUrl).toBe("https://www.luogu.com.cn/training/100");
    expect(detail.problems[0].id).toBe("P1001");
  });
});
