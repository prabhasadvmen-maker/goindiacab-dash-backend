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
const serverHeaders = (key) => ({
  'X-Goog-Api-Key': key,
  'Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
  'Origin': process.env.FRONTEND_URL || 'http://localhost:3000',
});

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
const toWaypoint = (p) =>
  p.address
    ? { address: p.address }
    : { location: { latLng: { latitude: Number(p.lat), longitude: Number(p.lng) } } };

export const getDistanceMatrix = async (origin, destination) => {
  try {
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

    const route = data.routes?.[0];
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
