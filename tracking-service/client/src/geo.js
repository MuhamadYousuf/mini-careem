// Pure geometry helpers. Kept free of React so they are trivial to unit-test.

// A rough bounding box around Karachi, where our demo rides happen.
export const BOUNDS = { minLat: 24.75, maxLat: 25.0, minLng: 66.95, maxLng: 67.2 };

// Project a (lat, lng) onto a 0..100 percentage inside the bounding box so
// points can be drawn on a plain <svg> without any map library or tiles.
export function project({ lat, lng }, bounds = BOUNDS) {
  const clamp = (v) => Math.max(0, Math.min(100, v));
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
  // SVG y grows downward, so invert latitude.
  const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
  return { x: clamp(x), y: clamp(y) };
}

// Linear interpolation between two points. t=0 -> a, t=1 -> b. Used to animate
// the driver smoothly along a leg of the trip.
export function lerp(a, b, t) {
  const clampT = Math.max(0, Math.min(1, t));
  return {
    lat: a.lat + (b.lat - a.lat) * clampT,
    lng: a.lng + (b.lng - a.lng) * clampT,
  };
}

// Great-circle distance in kilometres between two lat/lng points. Used to price
// the fare from the real trip length.
export function haversineKm(a, b) {
  const R = 6371; // Earth radius, km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
