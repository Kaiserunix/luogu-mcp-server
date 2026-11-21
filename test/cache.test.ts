import { describe, expect, test } from "vitest";
import { CachedLuoguGateway, TtlCache } from "../src/client/index.js";
import { FakeLuoguGateway } from "./fixtures/luoguFixtures.js";

describe("TtlCache", () => {
  test("returns cached values before TTL expiration and expires deterministically", async () => {
    let clock = 1_000;
    const cache = new TtlCache<string>({ now: () => clock });
    let loads = 0;

    const first = await cache.getOrLoad("k1", 500, async () => {
      loads += 1;
      return "value-1";
    });
    clock = 1_400;
    const second = await cache.getOrLoad("k1", 500, async () => {
      loads += 1;
      return "value-2";
    });
    clock = 1_500;
    const third = await cache.getOrLoad("k1", 500, async () => {
      loads += 1;
      return "value-3";
    });

    expect(first).toBe("value-1");
    expect(second).toBe("value-1");
    expect(third).toBe("value-3");
    expect(loads).toBe(2);
    expect(cache.stats()).toMatchObject({ hits: 1, misses: 2, coalesced: 0, size: 1 });
  });

  test("coalesces concurrent in-flight loads and never caches failures", async () => {
    const cache = new TtlCache<number>();
    let resolvePending!: (value: number) => void;
    let loadCount = 0;

    const pendingPromise = new Promise<number>((resolve) => {
      resolvePending = resolve;
    });

    const p1 = cache.getOrLoad("inflight", 1_000, () => {
      loadCount += 1;
      return pendingPromise;
    });
    const p2 = cache.getOrLoad("inflight", 1_000, async () => {
      loadCount += 1;
      return 999;
    });

    resolvePending(42);
    expect(await Promise.all([p1, p2])).toEqual([42, 42]);
    expect(loadCount).toBe(1);
    expect(cache.stats().coalesced).toBe(1);

    await expect(
      cache.getOrLoad("failing", 1_000, async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    const recovered = await cache.getOrLoad("failing", 1_000, async () => 7);
    expect(recovered).toBe(7);
  });

  test("evicts least-recently-used entries when maxEntries is reached", () => {
    const cache = new TtlCache<string>({ maxEntries: 2, now: () => 0 });
    cache.set("a", "1", 1_000);
    cache.set("b", "2", 1_000);
    expect(cache.get("a")).toBe("1");
    cache.set("c", "3", 1_000);

    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe("1");
    expect(cache.get("c")).toBe("3");
  });
});

describe("CachedLuoguGateway", () => {
  test("canonicalizes keys, deduplicates concurrent calls, and clones cached objects", async () => {
    const inner = new FakeLuoguGateway({
      searchResults: {
        树: [{ platform: "luogu", id: "P1305", title: "新二叉树", sourceUrl: "https://www.luogu.com.cn/problem/P1305", tags: ["11"] }],
      },
    });
    let clock = 10_000;
    const cached = new CachedLuoguGateway(inner, {
      problemTtlMs: 60_000,
      searchTtlMs: 30_000,
      now: () => clock,
    });

    const p1 = await cached.fetchProblem("p1305");
    p1.tags.push("mutated-by-caller");
    const p2 = await cached.fetchProblem("P1305");

    expect(p2.tags).toEqual(["11", "72"]);
    expect(inner.calls.filter((c) => c.method === "fetchProblem")).toHaveLength(1);

    await cached.searchProblems({ keyword: " 树 ", tagIds: [11, 2, 11] });
    await cached.searchProblems({ keyword: "树", tagIds: [2, 11] });
    expect(inner.calls.filter((c) => c.method === "searchProblems")).toHaveLength(1);

    clock += 30_000;
    await cached.searchProblems({ keyword: "树", tagIds: [2, 11] });
    expect(inner.calls.filter((c) => c.method === "searchProblems")).toHaveLength(2);

    cached.clearCache();
    expect(cached.getCacheStats().size).toBe(0);
  });
});
