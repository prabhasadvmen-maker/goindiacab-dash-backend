import { createTtlCache } from './ttlCache.js';

// Short-lived cache for public reads that rarely change (web config, vehicle list).
// Admin write endpoints call invalidatePublicCaches() so edits are visible on the next request.
export const publicReadCache = createTtlCache({ ttlMs: 60 * 1000, maxEntries: 20 });

export const invalidatePublicCaches = () => publicReadCache.clear();
