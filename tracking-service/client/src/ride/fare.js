// Fare model for a ride. Pure and side-effect free so it is trivial to test.
// Money here is only ever a display/estimate; the Wallet service remains the
// source of truth when the fare is actually charged.

export const BASE_FARE = 100; // PKR, flag-down
export const PER_KM = 45; // PKR per kilometre
export const MIN_FARE = 150; // PKR, minimum a ride can cost

// Price a ride from its distance in kilometres, rounded to 2 decimal places and
// never below the minimum fare.
export function computeFare(distanceKm) {
  if (typeof distanceKm !== 'number' || Number.isNaN(distanceKm) || distanceKm < 0) {
    throw new Error('distanceKm must be a non-negative number');
  }
  const raw = BASE_FARE + PER_KM * distanceKm;
  const rounded = Math.round(raw * 100) / 100;
  return Math.max(MIN_FARE, rounded);
}
