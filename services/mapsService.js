import axios from 'axios';

// Server-side key. Falls back to the browser key only for local testing.
const getGoogleKey = () => process.env.GOOGLE_MAP_SERVER_API || process.env.GOOGLE_MAP_API;

const requireKey = () => {
  const key = getGoogleKey();
  if (!key) throw new Error('GOOGLE_MAP_SERVER_API is not configured');
  return key;
};

const googleError = (err) =>
  err.response?.data?.error?.message || err.message;

// If the Google key is restricted by HTTP referrer, server calls must send a Referer the key allows.
// Candidates, in order: GOOGLE_MAPS_REFERER (comma list; "none" = send no referer, for IP-restricted keys),
// then the website/dashboard URLs. A blocked referer is retried with the next candidate and the working one is remembered.
const toOrigin = (v) => { try { return new URL(String(v).trim()).origin; } catch { return null; } };

const refererCandidates = () => {
  const list = [];
  for (const v of String(process.env.GOOGLE_MAPS_REFERER || '').split(',')) {
    if (v.trim().toLowerCase() === 'none') list.push(null);
    else if (toOrigin(v)) list.push(toOrigin(v));
  }
  for (const v of [process.env.WEBSITE_URL, process.env.FRONTEND_URL].flatMap((x) => String(x || '').split(','))) {
    if (toOrigin(v)) list.push(toOrigin(v));
  }
  list.push('https://goindiacab.com', 'https://www.goindiacab.com');
  return [...new Set(list)];
};

let workingReferer; // undefined = not found yet

const isRefererBlocked = (err) => /referer/i.test(googleError(err)) && /blocked/i.test(googleError(err));

const buildHeaders = (key, referer, extra = {}) => ({
  'X-Goog-Api-Key': key,
  ...(referer ? { Referer: `${referer}/`, Origin: referer } : {}),
  ...extra,
});

// Runs a Google request, trying referer candidates only when Google reports the referer as blocked.
const googleRequest = async ({ method, url, data, headers = {}, timeout }) => {
  const key = requireKey();
  const candidates = workingReferer !== undefined ? [workingReferer] : refererCandidates();
  let lastErr;
  for (const referer of candidates) {
    try {
      const res = await axios({ method, url, data, timeout, headers: buildHeaders(key, referer, headers) });
      if (workingReferer === undefined) {
        workingReferer = referer;
        console.log(`Google Maps: using referer ${referer || '(none)'}`);
      }
      return res.data;
    } catch (err) {
      lastErr = err;
      if (!isRefererBlocked(err)) throw err;
      if (workingReferer !== undefined) workingReferer = undefined; // it stopped working: search again next time
    }
  }
  console.error(
    `Google Maps: every referer was blocked (tried ${candidates.map((c) => c || 'none').join(', ')}). ` +
    `Add one of them to the key's website restrictions, or restrict the key by server IP and set GOOGLE_MAPS_REFERER=none. ` +
    `Key in use: ${process.env.GOOGLE_MAP_SERVER_API ? 'GOOGLE_MAP_SERVER_API' : 'GOOGLE_MAP_API (browser key!)'}`
  );
  throw lastErr;
};

// Places API (New) - autocomplete, restricted to India.
// opts.cities = true limits results to cities/localities (used by the website From/To boxes).
export const getAutoCompleteSuggestions = async (input, opts = {}) => {
  if (!input) return [];

  try {
    const body = { input, includedRegionCodes: ['in'], languageCode: 'en' };
    if (opts.cities) body.includedPrimaryTypes = ['(cities)'];

    const data = await googleRequest({
      method: 'post', url: 'https://places.googleapis.com/v1/places:autocomplete', data: body, timeout: 5000,
    });

    return (data.suggestions || [])
      .filter((s) => s.placePrediction)
      .map(({ placePrediction: p }) => ({
        placeId: p.placeId,
        description: p.text?.text || '',
        mainText: p.structuredFormat?.mainText?.text || p.text?.text || '',
        secondaryText: p.structuredFormat?.secondaryText?.text || '',
      }));
  } catch (error) {
    console.error('Google Autocomplete error:', googleError(error));
    throw new Error('Failed to fetch location suggestions');
  }
};

// Places API (New) - exact lat/lng + formatted address for a place id.
export const getPlaceDetails = async (placeId) => {
  if (!placeId) throw new Error('Place ID is required');

  try {
    const data = await googleRequest({
      method: 'get',
      url: `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      headers: { 'X-Goog-FieldMask': 'location,formattedAddress' },
      timeout: 5000,
    });

    if (!data.location) throw new Error('Place details not found');
    return {
      lat: data.location.latitude,
      lng: data.location.longitude,
      address: data.formattedAddress,
    };
  } catch (error) {
    console.error('Google Place Details error:', googleError(error));
    throw new Error('Failed to fetch location details');
  }
};

// Routes API - driving distance/time. Each end is { lat, lng } or { address }.
const toWaypoint = (p) => {
  if (p.placeId) return { placeId: p.placeId };
  if (p.address) return { address: p.address };
  return { location: { latLng: { latitude: Number(p.lat), longitude: Number(p.lng) } } };
};

const computeRoute = async (origin, destination) => {
  const data = await googleRequest({
    method: 'post',
    url: 'https://routes.googleapis.com/directions/v2:computeRoutes',
    data: {
      origin: toWaypoint(origin),
      destination: toWaypoint(destination),
      travelMode: 'DRIVE',
      regionCode: 'IN',
      units: 'METRIC',
    },
    headers: { 'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration' },
    timeout: 8000,
  });
  return data.routes?.[0];
};

const describe = (p) => p.placeId || p.address || `${p.lat},${p.lng}`;

// Google answers 5xx ("Internal Error Encountered") or times out now and then; one more try usually succeeds.
const computeRouteWithRetry = async (origin, destination) => {
  try {
    return await computeRoute(origin, destination);
  } catch (err) {
    const status = err.response?.status;
    if (status && status < 500 && status !== 429) throw err;
    return computeRoute(origin, destination);
  }
};

// A free-text place name can fail to geocode inside the Routes API; resolve it to exact coordinates ourselves instead.
const toCoordinates = async (p) => {
  if (p.placeId) return getPlaceDetails(p.placeId);
  if (p.address) {
    const [first] = await getAutoCompleteSuggestions(p.address.replace(/,?\s*India$/i, ''));
    if (first?.placeId) return getPlaceDetails(first.placeId);
  }
  return null;
};

const usableRoute = (r) => r && r.distanceMeters != null && r.distanceMeters > 0;

// Each end may carry a placeId (exact), an address, or lat/lng.
// Order: as given (retried once on Google 5xx) -> address instead of placeId -> exact coordinates found via Places.
export const getDistanceMatrix = async (origin, destination) => {
  const label = `${describe(origin)} -> ${describe(destination)}`;
  let lastError;

  const attempt = async (o, d) => {
    try {
      const route = await computeRouteWithRetry(o, d);
      if (usableRoute(route)) return route;
      lastError = new Error('Unable to calculate distance');
    } catch (err) {
      lastError = err;
    }
    return null;
  };

  let route = await attempt(origin, destination);

  if (!route && ((origin.placeId && origin.address) || (destination.placeId && destination.address))) {
    route = await attempt(
      origin.address ? { address: origin.address } : origin,
      destination.address ? { address: destination.address } : destination
    );
  }

  if (!route) {
    console.error(`Google Routes failed for ${label}: ${googleError(lastError)}; retrying with exact coordinates`);
    try {
      const [o, d] = await Promise.all([toCoordinates(origin), toCoordinates(destination)]);
      if (o && d) route = await attempt({ lat: o.lat, lng: o.lng }, { lat: d.lat, lng: d.lng });
    } catch (err) {
      lastError = err;
    }
  }

  if (!route) {
    console.error(`Google Routes error for ${label}:`, googleError(lastError));
    throw new Error('Failed to calculate exact distance');
  }

  const distanceMeters = route.distanceMeters;
  const durationSeconds = parseInt(String(route.duration || '0').replace('s', ''), 10) || 0;

  return {
    distance: { text: `${(distanceMeters / 1000).toFixed(1)} km`, value: distanceMeters },
    duration: { text: `${Math.round(durationSeconds / 60)} mins`, value: durationSeconds },
  };
};
