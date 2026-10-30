import WebAddon from '../models/WebAddon.js';

// Add-on prices are final (GST-inclusive) and sit on top of the fare; coupons only discount the fare.
export const addonPrice = (addon, billableKm) =>
  Math.round(addon.unit === 'perKm' ? Number(addon.price) * (Number(billableKm) || 0) : Number(addon.price));

/**
 * Resolves the add-on codes a customer picked into priced line items, entirely from server data.
 * Throws { code: 'VALIDATION_ERROR' } if any code is unknown, inactive or not offered for this trip type.
 */
// Titles may contain {city}, replaced with the trip's destination city (e.g. "Pause in {city} & Go").
export const addonTitle = (addon, city) => String(addon.title).replace(/{city}/gi, city || 'your destination');

export const resolveAddons = async (codes, { tripType, billableKm, city = '' }) => {
  const wanted = [...new Set((Array.isArray(codes) ? codes : []).map((c) => String(c).toLowerCase().trim()).filter(Boolean))].slice(0, 20);
  if (wanted.length === 0) return { items: [], total: 0 };

  const found = await WebAddon.find({ code: { $in: wanted }, isActive: true }).lean();
  const usable = found.filter((a) => !a.tripTypes?.length || a.tripTypes.includes(tripType));
  if (usable.length !== wanted.length) {
    throw Object.assign(new Error('One or more selected add-ons are no longer available'), { code: 'VALIDATION_ERROR' });
  }

  const items = usable
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((a) => ({ code: a.code, label: addonTitle(a, city), price: addonPrice(a, billableKm) }));
  return { items, total: items.reduce((s, i) => s + i.price, 0) };
};
