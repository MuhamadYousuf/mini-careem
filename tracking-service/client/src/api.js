// Fetch wrappers around the mini-Careem services. Every call goes through the
// gateway (same origin), so the UI never needs to know which VM serves what:
//   /api/wallet   -> Wallet   (Java / Spring / MySQL)
//   /api/drivers  -> Drivers  (Python / Django / MongoDB)
//   /api/tracking -> Tracking (Node / Redis)

const WALLET = '/api/wallet';
const DRIVERS = '/api/drivers';
const TRACKING = '/api/tracking';

// Parse a JSON response, turning any non-2xx into an Error carrying the
// service's own message so the UI can show a meaningful failure reason.
async function asJson(res) {
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body && body.error) msg = body.error;
    } catch (_) {
      /* body was not JSON */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ---------- Wallet ----------
export async function createWallet(ownerRef, currency = 'PKR') {
  return asJson(
    await fetch(`${WALLET}/wallets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerRef, currency }),
    })
  );
}

export async function depositWallet(walletId, amount) {
  return asJson(
    await fetch(`${WALLET}/wallets/${walletId}/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    })
  );
}

export async function getWallet(walletId) {
  return asJson(await fetch(`${WALLET}/wallets/${walletId}`));
}

// Wallet transfers return the transferId as plain text (not JSON), so this one
// reads the body as text.
export async function transfer({ fromWalletId, toWalletId, amount, description }) {
  const res = await fetch(`${WALLET}/transfers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromWalletId, toWalletId, amount, description }),
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body && body.error) msg = body.error;
    } catch (_) {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.text();
}

// ---------- Drivers ----------
export async function listDrivers(vehicleType) {
  const qs = vehicleType ? `?vehicle_type=${encodeURIComponent(vehicleType)}` : '';
  return asJson(await fetch(`${DRIVERS}/${qs}`));
}

export async function createDriver(driver) {
  return asJson(
    await fetch(`${DRIVERS}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(driver),
    })
  );
}

export async function updateDriver(driverId, patch) {
  return asJson(
    await fetch(`${DRIVERS}/${driverId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  );
}

// ---------- Tracking ----------
export async function fetchPings() {
  return asJson(await fetch(`${TRACKING}/pings`));
}

export async function sendPing(driverId, lat, lng) {
  return asJson(
    await fetch(`${TRACKING}/pings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId, lat, lng }),
    })
  );
}

// A convenient bundle so callers (and tests) can inject the whole API surface.
export default {
  createWallet,
  depositWallet,
  getWallet,
  transfer,
  listDrivers,
  createDriver,
  updateDriver,
  fetchPings,
  sendPing,
};
