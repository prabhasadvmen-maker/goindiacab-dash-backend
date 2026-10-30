// Tiny in-process cache for hot, rarely-changing reads (config, vehicle list, place suggestions).
// One Node process on EC2 means no Redis round trip is needed; entries expire on their own.

export const createTtlCache = ({ ttlMs, maxEntries = 500 }) => {
  const store = new Map(); // key -> { value, expires }
  const inflight = new Map(); // key -> Promise, so a burst of identical requests hits the source once

  const get = (key) => {
    const hit = store.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      store.delete(key);
      return undefined;
    }
    return hit.value;
  };

  const set = (key, value) => {
    if (store.size >= maxEntries) store.delete(store.keys().next().value); // drop the oldest
    store.set(key, { value, expires: Date.now() + ttlMs });
  };

  // Returns the cached value or runs `load()` once and caches the result. Failures are never cached.
  const wrap = async (key, load) => {
    const cached = get(key);
    if (cached !== undefined) return cached;
    if (inflight.has(key)) return inflight.get(key);
    const p = (async () => {
      try {
        const value = await load();
        set(key, value);
        return value;
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, p);
    return p;
  };

  return { get, set, wrap, clear: () => store.clear() };
};

// Express middleware: lets browsers / CDNs reuse a public GET response for `seconds`.
// Error responses are never cacheable.
export const publicCache = (seconds, staleSeconds = seconds * 5) => (req, res, next) => {
  res.set('Cache-Control', `public, max-age=${seconds}${staleSeconds > 0 ? `, stale-while-revalidate=${staleSeconds}` : ''}`);
  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 400) res.set('Cache-Control', 'no-store');
    return json(body);
  };
  next();
};
