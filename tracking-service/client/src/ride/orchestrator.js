// Ride orchestration: the steps that compose the three services into one ride.
//
// Every function takes the `api` object as its first argument so tests can pass
// a fake and no network is needed. Each step either returns its result or
// throws an Error whose message is a human-readable failure reason -- the UI
// turns that straight into the "Failed" state.

// Step 1 (Wallet): make sure the customer has a funded wallet to pay from.
export async function ensureCustomerWallet(api, ownerRef, funds) {
  let wallet;
  try {
    wallet = await api.createWallet(ownerRef);
    await api.depositWallet(wallet.id, funds);
  } catch (e) {
    throw new Error(`Wallet service: ${e.message}`);
  }
  const funded = await api.getWallet(wallet.id);
  return { walletId: funded.id, balance: funded.balance, ownerRef };
}

// Step 2 (Drivers): find a driver to assign, creating & activating a demo
// captain if the roster is empty. Returns the driver document.
export async function findOrCreateDriver(api) {
  let drivers;
  try {
    drivers = await api.listDrivers();
  } catch (e) {
    throw new Error(`Drivers service: ${e.message}`);
  }

  const active = (drivers || []).find((d) => d.status === 'ACTIVE');
  if (active) return active;
  if (drivers && drivers.length > 0) return drivers[0];

  // Roster empty: onboard a demo captain so the demo is self-seeding.
  const suffix = Math.floor(Math.random() * 100000);
  let created;
  try {
    created = await api.createDriver({
      name: 'Demo Captain',
      phone: `+9230000${String(suffix).padStart(5, '0')}`,
      license_number: `LIC-${suffix}`,
      vehicle_type: 'CAR',
      vehicle: { make: 'Toyota Corolla', seats: 4, ac: true, plate: `ABC-${suffix}` },
    });
    created = await api.updateDriver(created.id, { status: 'ACTIVE' });
  } catch (e) {
    throw new Error(`Drivers service: ${e.message}`);
  }
  return created;
}

// A driver's earnings live in the Wallet service, keyed by the driver id.
export async function ensureDriverWallet(api, ownerRef) {
  let wallet;
  try {
    wallet = await api.createWallet(ownerRef);
  } catch (e) {
    throw new Error(`Wallet service: ${e.message}`);
  }
  return { walletId: wallet.id, standingBalance: wallet.balance };
}

// Step 3 (Tracking): push the driver's live position. Returns {ok,error} rather
// than throwing, so the caller decides whether a dropped ping fails the ride.
export async function pingDriver(api, driverId, pos) {
  try {
    await api.sendPing(driverId, pos.lat, pos.lng);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Step 4 (Wallet): charge the fare from customer to driver, then read back the
// driver's new standing balance so the UI can show it updated.
export async function payFare(api, { fromWalletId, toWalletId, amount, description }) {
  try {
    await api.transfer({ fromWalletId, toWalletId, amount, description });
  } catch (e) {
    // Insufficient funds surfaces here as the wallet service's own 422 message.
    throw new Error(`Payment failed: ${e.message}`);
  }
  const driverWallet = await api.getWallet(toWalletId);
  return { standingBalance: driverWallet.balance };
}
