import { CACHE_MAX_ENTRIES } from "../config/constants";

/**
 * Generic in-memory cache with TTL-based expiration and a max entry cap.
 * Single responsibility: time-bounded key-value storage.
 *
 * Space complexity:
 *   - Worst case O(maxEntries) — hard cap enforced on every set().
 *   - On capacity hit, expired entries are bulk-purged first (O(n) scan).
 *     Only if still full after purge does it evict the oldest live entry.
 *     This avoids the prior bug where expired entries accumulated silently
 *     until their individual get() calls cleaned them up one by one.
 */
export class CacheService<T> {
  private readonly store = new Map<string, { value: T; expiresAt: number }>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  /**
   * @param ttlSeconds  Time-to-live in seconds (default: 300 = 5 min).
   * @param maxEntries  Hard cap on live entries (default: 500).
   */
  constructor(ttlSeconds: number = 300, maxEntries: number = CACHE_MAX_ENTRIES) {
    this.ttlMs = ttlSeconds * 1000;
    this.maxEntries = maxEntries;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (entry === undefined) {
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    // Updating an existing key never grows the map — skip capacity check.
    if (!this.store.has(key) && this.store.size >= this.maxEntries) {
      this.purgeExpired();

      // If still at capacity after purging expired entries, evict oldest live entry.
      if (this.store.size >= this.maxEntries) {
        const oldestKey = this.store.keys().next().value;
        if (oldestKey !== undefined) {
          this.store.delete(oldestKey);
        }
      }
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  /**
   * Removes all entries whose TTL has elapsed.
   * O(n) time, reduces space immediately rather than waiting for lazy get() cleanup.
   */
  purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  /** Exposed for testing / diagnostics only. */
  get size(): number {
    return this.store.size;
  }
}
