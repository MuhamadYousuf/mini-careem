// Tiny fetch wrapper around the Tracking API. All calls go through the gateway
// under /api/tracking, so the UI never needs to know which VM serves them.

const BASE = '/api/tracking';

export async function fetchPings() {
  const res = await fetch(`${BASE}/pings`);
  if (!res.ok) throw new Error('failed to load pings');
  return res.json();
}

export async function sendPing(driverId, lat, lng) {
  const res = await fetch(`${BASE}/pings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ driverId, lat, lng }),
  });
  if (!res.ok) throw new Error('failed to send ping');
  return res.json();
}
