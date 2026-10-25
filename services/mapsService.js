import axios from 'axios';

// Server-side key (no referrer restriction). Falls back to the browser key only for local testing.
const getGoogleKey = () => process.env.GOOGLE_MAP_SERVER_API || process.env.GOOGLE_MAP_API;

const requireKey = () => {
  const key = getGoogleKey();
  if (!key) throw new Error('GOOGLE_MAP_SERVER_API is not configured');
  return key;
};

const googleError = (err) =>
  err.response?.data?.error?.message || err.message;

// Server-side calls need a Referer header when the key has HTTP referrer restrictions.
// FRONTEND_URL may hold several comma-separated URLs or a trailing slash; Google matches the referrer against patterns like "site.com/*".
// GOOGLE_MAPS_REFERER must be a domain the Google key allows (e.g. https://goindiacab.com); it falls back to FRONTEND_URL,
// which on production is the dashboard domain and is usually not in the key's referrer list.
const frontendOrigin = () => {
  const first = String(process.env.GOOGLE_MAPS_REFERER || process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
  try { return new URL(first).origin; } catch { return 'http://localhost:3000'; }
};

// GOOGLE_MAPS_REFERER=none sends no Referer/Origin at all: use it when the key is restricted by server IP instead of referrer.
const serverHeaders = (key) => {
  if (String(process.env.GOOGLE_MAPS_REFERER || '').toLowerCase() === 'none') return { 'X-Goog-Api-Key': key };
  return { 'X-Goog-Api-Key': key, 'Referer': `${frontendOrigin()}/`, 'Origin': frontendOrigin() };
};

// Places API (New) - autocomplete, restricted to India.
// opts.cities = true limits results to cities/localities (used by the website From/To boxes).
export const getAutoCompleteSuggestions = async (input, opts = {}) => {
  if (!input) return [];

  try {
    const body = { input, includedRegionCodes: ['in'], languageCode: 'en' };
    if (opts.cities) body.includedPrimaryTypes = ['(cities)'];

    const { data } = await axios.post('https://places.googleapis.com/v1/places:autocomplete', body, {
      headers: serverHeaders(requireKey()),
      timeout: 5000,
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
    const { data } = await axios.get(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        ...serverHeaders(requireKey()),
        'X-Goog-FieldMask': 'location,formattedAddress',
      },
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
  const { data } = await axios.post(
    'https://routes.googleapis.com/directions/v2:computeRoutes',
    {
      origin: toWaypoint(origin),
      destination: toWaypoint(destination),
      travelMode: 'DRIVE',
      regionCode: 'IN',
      units: 'METRIC',
    },
    {
      headers: {
        ...serverHeaders(requireKey()),
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
      },
      timeout: 8000,
    }
  );
  return data.routes?.[0];
};

// Each end may carry a placeId (exact), an address, or lat/lng. If the exact form is rejected, retry with the address.
export const getDistanceMatrix = async (origin, destination) => {
  try {
    let route;
    try {
      route = await computeRoute(origin, destination);
    } catch (err) {
      const canRetry = (origin.placeId && origin.address) || (destination.placeId && destination.address);
      if (!canRetry) throw err;
      console.error('Google Routes (placeId) failed, retrying with address:', googleError(err));
      route = await computeRoute(
        origin.address ? { address: origin.address } : origin,
        destination.address ? { address: destination.address } : destination
      );
    }

    if (!route || route.distanceMeters == null) throw new Error('Unable to calculate distance');

    const distanceMeters = route.distanceMeters;
    const durationSeconds = parseInt(String(route.duration || '0').replace('s', ''), 10) || 0;

    return {
      distance: { text: `${(distanceMeters / 1000).toFixed(1)} km`, value: distanceMeters },
      duration: { text: `${Math.round(durationSeconds / 60)} mins`, value: durationSeconds },
    };
  } catch (error) {
    console.error('Google Routes error:', googleError(error));
    throw new Error('Failed to calculate exact distance');
  }
};
