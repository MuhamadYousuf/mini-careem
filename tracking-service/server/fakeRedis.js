// Minimal in-memory Redis double for tests. Implements just the commands the
// store uses: set (with EX), get, keys, ttl, flushall. Honours TTL expiry so
// the "pings expire on their own" behaviour can be tested.
class FakeRedis {
  constructor() {
    this.store = new Map(); // key -> { value, expiresAt|null }
  }

  async set(key, value, mode, seconds) {
    const expiresAt = mode === 'EX' ? Date.now() + seconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  _live(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }

  async get(key) {
    const entry = this._live(key);
    return entry ? entry.value : null;
  }

  async ttl(key) {
    const entry = this._live(key);
    if (!entry) return -2; // Redis: key does not exist
    if (entry.expiresAt === null) return -1; // no expiry set
    return Math.ceil((entry.expiresAt - Date.now()) / 1000);
  }

  async keys(pattern) {
    // Only the trailing '*' glob is needed here.
    const prefix = pattern.replace(/\*$/, '');
    const result = [];
    for (const key of this.store.keys()) {
      if (this._live(key) && key.startsWith(prefix)) result.push(key);
    }
    return result;
  }

  async flushall() {
    this.store.clear();
    return 'OK';
  }
}

module.exports = FakeRedis;
