// In-memory cache for Phase 0 (Redis in Phase 1)
class SimpleCache {
  constructor(ttlMs = 5 * 60 * 1000) {
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttl,
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// Singleton instances
const universityCache = new SimpleCache(10 * 60 * 1000); // 10 min
const courseCache = new SimpleCache(5 * 60 * 1000); // 5 min
const questionCache = new SimpleCache(2 * 60 * 1000); // 2 min

module.exports = {
  SimpleCache,
  universityCache,
  courseCache,
  questionCache,
};
