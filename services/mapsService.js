import axios from 'axios';

const getGeoapifyKey = () => process.env.GEOAPIFY_API_KEY;

export const getAutoCompleteSuggestions = async (input) => {
  if (!input) return [];
  
  try {
    const response = await axios.get(`https://api.geoapify.com/v1/geocode/autocomplete`, {
      params: {
        text: input,
        apiKey: getGeoapifyKey(),
        filter: 'countrycode:in' // Restrict to India
      }
    });

    if (response.data && response.data.features) {
      return response.data.features.map(f => ({
        placeId: f.properties.place_id,
        description: f.properties.formatted,
        mainText: f.properties.address_line1 || f.properties.name,
        secondaryText: f.properties.address_line2,
        lat: f.properties.lat, // Geoapify provides lat/lon immediately
        lng: f.properties.lon
      }));
    }
    return [];
  } catch (error) {
    console.error('Geoapify Autocomplete error:', error.message);
    throw new Error('Failed to fetch location suggestions');
  }
};

export const getPlaceDetails = async (placeId) => {
  if (!placeId) throw new Error('Place ID is required');

  try {
    const response = await axios.get(`https://api.geoapify.com/v2/place-details`, {
      params: {
        id: placeId,
        apiKey: getGeoapifyKey()
      }
    });

    if (response.data && response.data.features && response.data.features.length > 0) {
      const location = response.data.features[0].properties;
      return {
        lat: location.lat,
        lng: location.lon,
        address: location.formatted
      };
    }
    throw new Error('Place details not found');
  } catch (error) {
    console.error('Geoapify Place Details error:', error.message);
    throw new Error('Failed to fetch location details');
  }
};

export const getDistanceMatrix = async (origin, destination) => {
  try {
    const response = await axios.get(`https://api.geoapify.com/v1/routing`, {
      params: {
        waypoints: `${origin.lat},${origin.lng}|${destination.lat},${destination.lng}`,
        mode: 'drive',
        apiKey: getGeoapifyKey()
      }
    });

    if (response.data && response.data.features && response.data.features.length > 0) {
      const properties = response.data.features[0].properties;
      const distanceMeters = properties.distance;
      const durationSeconds = properties.time;

      return {
        distance: { text: `${(distanceMeters / 1000).toFixed(1)} km`, value: distanceMeters },
        duration: { text: `${Math.round(durationSeconds / 60)} mins`, value: durationSeconds }
      };
    }
    throw new Error('Unable to calculate distance');
  } catch (error) {
    console.error('Geoapify Distance Routing error:', error.message);
    throw new Error('Failed to calculate exact distance');
  }
};
