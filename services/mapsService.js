import axios from 'axios';

const getBaseUrl = () => 'https://maps.googleapis.com/maps/api';

/**
 * Get place predictions based on user input
 * @param {string} input - Text typed by user
 * @returns {Array} - Array of place suggestions
 */
export const getAutoCompleteSuggestions = async (input) => {
  if (!input) return [];
  
  try {
    const response = await axios.get(`${getBaseUrl()}/place/autocomplete/json`, {
      params: {
        input,
        key: process.env.GOOGLE_MAPS_API_KEY,
        components: 'country:in' // Restrict to India for this project
      }
    });

    if (response.data.status === 'OK') {
      return response.data.predictions.map(p => ({
        placeId: p.place_id,
        description: p.description,
        mainText: p.structured_formatting?.main_text,
        secondaryText: p.structured_formatting?.secondary_text
      }));
    }
    return [];
  } catch (error) {
    console.error('Maps API Autocomplete error:', error.message);
    throw new Error('Failed to fetch location suggestions');
  }
};

/**
 * Get coordinates (lat, lng) and details for a Place ID
 * @param {string} placeId - Google Place ID
 * @returns {Object} - { lat, lng, address }
 */
export const getPlaceDetails = async (placeId) => {
  if (!placeId) throw new Error('Place ID is required');

  try {
    const response = await axios.get(`${getBaseUrl()}/place/details/json`, {
      params: {
        place_id: placeId,
        fields: 'geometry,formatted_address',
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status === 'OK') {
      const location = response.data.result.geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
        address: response.data.result.formatted_address
      };
    }
    throw new Error('Place details not found');
  } catch (error) {
    console.error('Maps API Place Details error:', error.message);
    throw new Error('Failed to fetch location details');
  }
};

/**
 * Get real road distance and duration between two coordinates
 * @param {Object} origin - { lat, lng }
 * @param {Object} destination - { lat, lng }
 * @returns {Object} - { distance: { text, value }, duration: { text, value } }
 */
export const getDistanceMatrix = async (origin, destination) => {
  try {
    const response = await axios.get(`${getBaseUrl()}/distancematrix/json`, {
      params: {
        origins: `${origin.lat},${origin.lng}`,
        destinations: `${destination.lat},${destination.lng}`,
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status === 'OK' && response.data.rows[0].elements[0].status === 'OK') {
      const element = response.data.rows[0].elements[0];
      return {
        distance: element.distance, // { text: '5.2 km', value: 5200 }
        duration: element.duration  // { text: '15 mins', value: 900 }
      };
    }
    throw new Error('Unable to calculate distance');
  } catch (error) {
    console.error('Maps API Distance Matrix error:', error.message);
    throw new Error('Failed to calculate exact distance');
  }
};
