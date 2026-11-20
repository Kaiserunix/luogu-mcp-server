import type { CacheStats } from "../types.js";

export interface TtlCacheOptions {
  maxEntries?: number;
  now?: () => number;
}

interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

/**
 * Bounded LRU-ish TTL cache with in-flight request coalescing (singleflight).
 * Rejected loader promises are never cached.
 */
export class TtlCache<V = unknown> {
  private readonly entries = new Map<string, CacheEntry<V>>();
  private readonly inFlight = new Map<string, Promise<V>>();
  private readonly maxEntries: number;
  private readonly now: () => number;
  private hits = 0;
  private misses = 0;
  private coalesced = 0;

  constructor(options: TtlCacheOptions = {}) {
    const max = options.maxEntries ?? 256;
    this.maxEntries = Number.isFinite(max) && max >= 1 ? Math.floor(max) : 256;
    this.now = options.now ?? (() => Date.now());
  }

  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }

    // Refresh insertion order for LRU eviction.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V, ttlMs: number): void {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
      return;
    }

    if (this.entries.has(key)) {
      this.entries.delete(key);
    } else if (this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey !== undefined) {
        this.entries.delete(oldestKey);
      }
    }

    this.entries.set(key, {
      value,
      expiresAt: this.now() + ttlMs,
    });
  }

  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  async getOrLoad<T extends V>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      this.hits += 1;
      return cached as T;
    }

    const pending = this.inFlight.get(key);
    if (pending) {
      this.coalesced += 1;
      return pending as Promise<T>;
    }

    this.misses += 1;
    const loadPromise = loader()
      .then((value) => {
        this.set(key, value, ttlMs);
        return value;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, loadPromise);
    return loadPromise;
  }

  stats(): CacheStats {
    this.pruneExpired();
    return {
      hits: this.hits,
      misses: this.misses,
      coalesced: this.coalesced,
      size: this.entries.size,
    };
  }

  private pruneExpired(): void {
    const current = this.now();
    for (const [key, entry] of this.entries.entries()) {
      if (entry.expiresAt <= current) {
        this.entries.delete(key);
      }
    }
  }
}
