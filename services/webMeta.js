import { TRIP_TYPES } from './webFareService.js';

const LABELS = {
  oneway: 'One Way',
  roundtrip: 'Round Trip',
  airport: 'Airport',
  local: 'Hourly Rental',
};

// Every trip type the fare engine knows, with the name admins see. A new trip type without a label falls back to its key.
export const getTripTypeMeta = () => TRIP_TYPES.map((value) => ({ value, label: LABELS[value] || value }));
