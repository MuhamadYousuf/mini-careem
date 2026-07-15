import { describe, test, expect } from 'vitest';
import {
  ensureCustomerWallet,
  findOrCreateDriver,
  ensureDriverWallet,
  pingDriver,
  payFare,
} from './orchestrator';

// A configurable fake of the api surface. Overrides let each test bend one call.
function fakeApi(overrides = {}) {
  return {
    createWallet: async (ref) => ({ id: ref.startsWith('customer') ? 'wc' : 'wd', ownerRef: ref, balance: 0 }),
    depositWallet: async (id, amount) => ({ id, balance: amount }),
    getWallet: async (id) => ({ id, balance: id === 'wc' ? 1000 : 250 }),
    listDrivers: async () => [],
    createDriver: async (d) => ({ id: 'drv-1', ...d, status: 'PENDING' }),
    updateDriver: async (id, p) => ({ id, name: 'Demo Captain', vehicle_type: 'CAR', ...p }),
    transfer: async () => 'tid-1',
    sendPing: async () => ({ ok: true }),
    ...overrides,
  };
}

describe('ensureCustomerWallet', () => {
  test('creates and funds a wallet', async () => {
    const res = await ensureCustomerWallet(fakeApi(), 'customer-1', 1000);
    expect(res.walletId).toBe('wc');
    expect(res.balance).toBe(1000);
  });

  test('reports a wallet outage as the failure reason', async () => {
    const api = fakeApi({ createWallet: async () => { throw new Error('503'); } });
    await expect(ensureCustomerWallet(api, 'customer-1', 1000)).rejects.toThrow(/Wallet service/);
  });
});

describe('findOrCreateDriver', () => {
  test('reuses an existing ACTIVE driver', async () => {
    const api = fakeApi({ listDrivers: async () => [{ id: 'd9', status: 'ACTIVE', name: 'Ali' }] });
    const d = await findOrCreateDriver(api);
    expect(d.id).toBe('d9');
  });

  test('onboards and activates a driver when the roster is empty', async () => {
    const d = await findOrCreateDriver(fakeApi());
    expect(d.id).toBe('drv-1');
    expect(d.status).toBe('ACTIVE');
  });

  test('reports a drivers outage as the failure reason', async () => {
    const api = fakeApi({ listDrivers: async () => { throw new Error('refused'); } });
    await expect(findOrCreateDriver(api)).rejects.toThrow(/Drivers service/);
  });
});

describe('pingDriver', () => {
  test('soft-fails: a dropped ping does not throw', async () => {
    const api = fakeApi({ sendPing: async () => { throw new Error('no route'); } });
    const r = await pingDriver(api, 'd1', { lat: 1, lng: 2 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no route/);
  });
});

describe('payFare', () => {
  test('charges the fare and reads back the driver balance', async () => {
    const res = await payFare(fakeApi(), { fromWalletId: 'wc', toWalletId: 'wd', amount: 300 });
    expect(res.standingBalance).toBe(250);
  });

  test('surfaces insufficient funds from the wallet service', async () => {
    const api = fakeApi({ transfer: async () => { throw new Error('Insufficient funds in wallet: 1'); } });
    await expect(payFare(api, { fromWalletId: 'wc', toWalletId: 'wd', amount: 99999 }))
      .rejects.toThrow(/Payment failed: Insufficient funds/);
  });
});
