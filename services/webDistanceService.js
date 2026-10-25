import WebRoute from '../models/WebRoute.js';
import { getDistanceMatrix } from './mapsService.js';

const key = (s) => String(s || '').trim().toLowerCase();

// The Routes API resolves city names itself, no separate geocoding step needed.
const cityAddress = (name) => {
  const clean = String(name).replace(/\s*\/\s*NCR/i, '').replace(/,?\s*India\s*$/i, '').trim();
  return { address: `${clean}, India` };
};

// Order: admin/cached route (either direction) -> Google Routes (cached for next time).
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

  const matrix = await getDistanceMatrix(cityAddress(from), cityAddress(to));
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
