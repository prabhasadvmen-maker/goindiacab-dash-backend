import WebRoute from '../models/WebRoute.js';
import { getAutoCompleteSuggestions, getDistanceMatrix } from './mapsService.js';

const key = (s) => String(s || '').trim().toLowerCase();

const geocodeCity = async (name) => {
  const results = await getAutoCompleteSuggestions(name);
  const hit = results.find((r) => r.lat != null && r.lng != null);
  if (!hit) throw new Error(`Could not locate "${name}"`);
  return { lat: hit.lat, lng: hit.lng };
};

// Order: admin/cached route (either direction) -> Geoapify routing (cached for next time).
export const resolveDistance = async (from, to) => {
  const fromKey = key(from);
  const toKey = key(to);
  if (!fromKey || !toKey) throw new Error('from and to are required');
  if (fromKey === toKey) throw new Error('Pickup and drop cannot be the same city');

  const stored = await WebRoute.findOne({
    isActive: true,
    $or: [{ fromKey, toKey }, { fromKey: toKey, toKey: fromKey }],
  });
  if (stored) {
    return {
      distanceKm: stored.distanceKm,
      durationMins: stored.durationMins,
      routeLabel: `${from} → ${to}`,
      source: stored.source === 'auto' ? 'cache' : 'admin',
    };
  }

  const [a, b] = await Promise.all([geocodeCity(from), geocodeCity(to)]);
  const matrix = await getDistanceMatrix(a, b);
  const distanceKm = Math.round(matrix.distance.value / 1000);
  const durationMins = Math.round(matrix.duration.value / 60);

  try {
    await WebRoute.create({
      from: from.trim(), to: to.trim(), fromKey, toKey,
      distanceKm: Math.max(1, distanceKm), durationMins, source: 'auto',
    });
  } catch { /* duplicate from a concurrent request - ignore */ }

  return { distanceKm, durationMins, routeLabel: `${from} → ${to}`, source: 'api' };
};
