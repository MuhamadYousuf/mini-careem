// Pure helper: project a (lat, lng) onto a 0..100 percentage inside a bounding
// box so drivers can be drawn on a plain <svg> without any map library or tiles.
// Kept separate from React so it is trivial to unit-test.

// A rough bounding box around Karachi, where our demo rides happen.
export const BOUNDS = { minLat: 24.75, maxLat: 25.0, minLng: 66.95, maxLng: 67.2 };

export function project({ lat, lng }, bounds = BOUNDS) {
  const clamp = (v) => Math.max(0, Math.min(100, v));
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
  // SVG y grows downward, so invert latitude.
  const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
  return { x: clamp(x), y: clamp(y) };
}
