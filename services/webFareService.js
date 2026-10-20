// Pure fare calculation for the public website. All amounts are whole rupees.
const round = (n) => Math.round(Number(n) || 0);

export const TRIP_TYPES = ['oneway', 'roundtrip', 'local'];

export const calculateWebFare = (rule, { distanceKm, tripType = 'oneway', packageLabel = '', days = 1 }) => {
  const dist = Math.max(0, Number(distanceKm) || 0);
  const nDays = Math.max(1, Math.floor(Number(days) || 1));

  let baseFare = 0;
  let extraKmFare = 0;
  let driverAllowance = 0;
  let includedKm = 0;
  let billableKm = 0;
  let perKmAfter = 0;

  if (tripType === 'local') {
    const pkg = rule.packages.find((p) => p.label === packageLabel) || rule.packages[0];
    if (!pkg) throw new Error('No local package configured for this vehicle');
    baseFare = pkg.price;
    includedKm = pkg.km;
    perKmAfter = pkg.extraKmRate;
    billableKm = Math.max(dist, pkg.km);
    extraKmFare = Math.max(0, dist - pkg.km) * pkg.extraKmRate;
  } else if (tripType === 'roundtrip') {
    const travelKm = dist * 2;
    includedKm = rule.minKmPerDay * nDays;
    perKmAfter = rule.perKmRound;
    billableKm = Math.max(travelKm, includedKm);
    baseFare = includedKm * rule.perKmRound;
    extraKmFare = Math.max(0, travelKm - includedKm) * rule.perKmRound;
    driverAllowance = rule.driverAllowancePerDay * nDays;
  } else {
    includedKm = Math.max(dist, rule.minKmOneway);
    billableKm = includedKm;
    perKmAfter = rule.perKmOneway;
    baseFare = includedKm * rule.perKmOneway;
    driverAllowance = rule.driverAllowance;
  }

  baseFare = round(baseFare);
  extraKmFare = round(extraKmFare);
  driverAllowance = round(driverAllowance);
  const gst = round(((baseFare + extraKmFare + driverAllowance) * rule.gstPercent) / 100);
  const total = baseFare + extraKmFare + driverAllowance + gst;

  return {
    baseFare,
    extraKmFare,
    driverAllowance,
    gst,
    total,
    billableKm: round(billableKm),
    includedKm: round(includedKm),
    perKmAfter: round(perKmAfter),
  };
};

// Split total into pay-now / pay-later for the chosen payment option.
export const splitPayment = (total, paymentOption, partPercent) => {
  if (paymentOption === 'full') return { paidNow: total, payLater: 0 };
  const paidNow = Math.round((total * partPercent) / 100);
  return { paidNow, payLater: total - paidNow };
};
