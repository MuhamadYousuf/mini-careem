import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import LiveMap from './LiveMap';

// The component talks to the API only through fetch, so we stub global fetch.
beforeEach(() => {
  global.fetch = vi.fn((url) => {
    if (String(url).endsWith('/pings')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          { driverId: 'driver-1', lat: 24.86, lng: 67.0 },
          { driverId: 'driver-2', lat: 24.9, lng: 67.1 },
        ]),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LiveMap', () => {
  test('renders live drivers returned by the API', async () => {
    render(<LiveMap pollMs={100000} />);
    await waitFor(() => {
      expect(screen.getByText('Live drivers (2)')).toBeInTheDocument();
    });
    // Both drivers appear (table shows the id text at least once each).
    expect(screen.getAllByText('driver-1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('driver-2').length).toBeGreaterThan(0);
  });

  test('shows a warning when the API is unreachable', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false }));
    render(<LiveMap pollMs={100000} />);
    await waitFor(() => {
      expect(screen.getByText(/Can't reach tracking service/)).toBeInTheDocument();
    });
  });
});
