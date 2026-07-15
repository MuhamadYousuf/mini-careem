import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RideDemo from './RideDemo';

// A small in-memory fake of the whole api surface. The driver balance is real
// state so we can assert it actually changes when the fare is charged.
function makeApi() {
  let driverBal = 0;
  return {
    createWallet: async (ref) => ({
      id: ref.startsWith('customer') ? 'wc' : 'wd',
      ownerRef: ref,
      balance: 0,
    }),
    depositWallet: async (id, amount) => ({ id, balance: amount }),
    getWallet: async (id) => (id === 'wd' ? { id, balance: driverBal } : { id, balance: 700 }),
    listDrivers: async () => [
      { id: 'd1', name: 'Test Captain', vehicle_type: 'CAR', vehicle: { make: 'Civic' }, status: 'ACTIVE' },
    ],
    createDriver: async (d) => ({ id: 'd1', ...d }),
    updateDriver: async (id, p) => ({ id, ...p }),
    transfer: async ({ amount }) => {
      driverBal += amount;
      return 'tid';
    },
    sendPing: async () => ({}),
  };
}

const fastConfig = { arriveMs: 20, rideMs: 20, frameMs: 10 };

describe('RideDemo', () => {
  test('runs the full happy path and updates the driver balance', async () => {
    render(<RideDemo apiClient={makeApi()} config={fastConfig} />);

    fireEvent.click(screen.getByTestId('request-btn'));

    await waitFor(
      () => expect(screen.getByTestId('status-badge')).toHaveTextContent('Complete'),
      { timeout: 4000 }
    );

    // The driver's standing balance moved from 0 to the charged fare.
    const balance = Number(screen.getByTestId('driver-balance').textContent);
    expect(balance).toBeGreaterThan(0);
    // A fare was computed and shown.
    expect(Number(screen.getByTestId('fare').textContent)).toBeGreaterThan(0);
  });

  test('shows Failed with a reason when no driver is available', async () => {
    render(<RideDemo apiClient={makeApi()} config={fastConfig} />);

    fireEvent.change(screen.getByTestId('fault-select'), { target: { value: 'no_driver' } });
    fireEvent.click(screen.getByTestId('request-btn'));

    await waitFor(() =>
      expect(screen.getByTestId('status-badge')).toHaveTextContent('Failed')
    );
    expect(screen.getByTestId('fail-reason')).toHaveTextContent('No drivers available');
  });

  test('surfaces a real insufficient-funds failure from the wallet at payment', async () => {
    // Wallet that rejects the transfer exactly as the Java service's 422 would.
    const api = makeApi();
    api.transfer = async () => {
      throw new Error('Insufficient funds in wallet: 1');
    };
    render(<RideDemo apiClient={api} config={fastConfig} />);

    fireEvent.click(screen.getByTestId('request-btn'));

    await waitFor(
      () => expect(screen.getByTestId('status-badge')).toHaveTextContent('Failed'),
      { timeout: 4000 }
    );
    expect(screen.getByTestId('fail-reason')).toHaveTextContent(/Insufficient funds/);
  });
});
