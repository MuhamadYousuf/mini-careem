import { useEffect, useReducer, useRef } from 'react';
import realApi from './api';
import { project, lerp, haversineKm } from './geo';
import { computeFare } from './ride/fare';
import {
  STATUS,
  HAPPY_PATH,
  meta,
  isTerminal,
  stepIndex,
} from './ride/rideStatus';
import {
  ensureCustomerWallet,
  findOrCreateDriver,
  ensureDriverWallet,
  pingDriver,
  payFare,
} from './ride/orchestrator';

// --- demo geography (a short hop across Karachi) ---
const DRIVER_START = { lat: 24.81, lng: 66.99 };
const PICKUP = { lat: 24.86, lng: 67.03 };
const DESTINATION = { lat: 24.93, lng: 67.09 };

// --- default tunables (overridable via props for tests) ---
const DEFAULT_CONFIG = {
  arriveMs: 5000, // time for the driver to reach the pickup
  rideMs: 5000, // time from pickup to destination
  frameMs: 50, // animation frame interval
  funds: 1000, // PKR deposited into the customer wallet
  poorFunds: 20, // PKR when demoing the insufficient-funds failure
};

const initialState = {
  status: STATUS.IDLE,
  failReason: null,
  customer: null, // { walletId, balance, ref }
  driver: null, // { profile, walletId, standingBalance }
  driverPos: DRIVER_START,
  target: PICKUP, // where the dashed route currently points
  fare: null,
  progress: 0, // 0..1 of the current leg
  pings: 0,
  log: [],
  fault: 'none',
  running: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'RESET':
      return { ...initialState, fault: state.fault };
    case 'START':
      return { ...state, running: true, status: STATUS.REQUESTED, failReason: null, log: [] };
    case 'STATUS':
      return { ...state, status: action.status, target: action.target ?? state.target };
    case 'CUSTOMER':
      return { ...state, customer: action.customer };
    case 'DRIVER':
      return { ...state, driver: action.driver };
    case 'DRIVER_BALANCE':
      return { ...state, driver: { ...state.driver, standingBalance: action.balance } };
    case 'FARE':
      return { ...state, fare: action.fare };
    case 'POS':
      return { ...state, driverPos: action.pos, progress: action.progress };
    case 'PING_ACK':
      return { ...state, pings: state.pings + 1 };
    case 'LOG':
      return { ...state, log: [...state.log, { at: Date.now(), msg: action.msg, kind: action.kind || 'info' }] };
    case 'FAIL':
      return { ...state, status: STATUS.FAILED, failReason: action.reason, running: false };
    case 'DONE':
      return { ...state, status: STATUS.COMPLETE, running: false, progress: 1 };
    case 'FAULT':
      return { ...state, fault: action.fault };
    default:
      return state;
  }
}

export default function RideDemo({ apiClient = realApi, config = {} }) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const [state, dispatch] = useReducer(reducer, initialState);
  const cancelled = useRef(false);

  // Cancel any in-flight animation if the component goes away.
  useEffect(() => () => { cancelled.current = true; }, []);

  const log = (msg, kind) => dispatch({ type: 'LOG', msg, kind });

  // Animate the driver along one leg, sending live pings to the Tracking
  // service as it moves. Resolves {cancelled} or rejects on a tracking fault.
  function animateLeg(from, to, ms, driverId, opts = {}) {
    return new Promise((resolve, reject) => {
      const steps = Math.max(1, Math.round(ms / cfg.frameMs));
      let i = 0;
      const id = setInterval(() => {
        if (cancelled.current) {
          clearInterval(id);
          return resolve({ cancelled: true });
        }
        i += 1;
        const t = Math.min(1, i / steps);
        const pos = lerp(from, to, t);
        dispatch({ type: 'POS', pos, progress: t });

        // Best-effort GPS ping every other frame.
        if (i % 2 === 0) {
          pingDriver(apiClient, driverId, pos).then((r) => {
            if (r.ok && !cancelled.current) dispatch({ type: 'PING_ACK' });
          });
        }
        // Injected tracking outage: lose the signal partway through the leg.
        if (opts.failTracking && t >= 0.4) {
          clearInterval(id);
          return reject(new Error('Tracking service: lost GPS signal mid-route'));
        }
        if (t >= 1) {
          clearInterval(id);
          return resolve({ cancelled: false });
        }
      }, cfg.frameMs);
    });
  }

  async function runRide() {
    if (state.running) return;
    cancelled.current = false;
    dispatch({ type: 'START' });
    const fault = state.fault;

    try {
      // --- 1. Customer requests a ride (Wallet service) ---
      log('Customer taps "Book ride"');
      const funds = fault === 'insufficient_funds' ? cfg.poorFunds : cfg.funds;
      const ref = `customer-${Date.now()}`;
      const customer = await ensureCustomerWallet(apiClient, ref, funds);
      dispatch({ type: 'CUSTOMER', customer });
      log(`Wallet · customer wallet #${customer.walletId} funded with ${funds} PKR`, 'wallet');

      // --- 2. Assign a driver (Drivers service), reusing one across rides ---
      dispatch({ type: 'STATUS', status: STATUS.ASSIGNED, target: PICKUP });
      if (fault === 'no_driver') throw new Error('No drivers available near you');

      let driver = state.driver;
      if (!driver) {
        const profile = await findOrCreateDriver(apiClient);
        const wallet = await ensureDriverWallet(apiClient, profile.id);
        driver = { profile, walletId: wallet.walletId, standingBalance: wallet.standingBalance };
        dispatch({ type: 'DRIVER', driver });
        log(`Drivers · assigned ${profile.name} (${profile.vehicle_type})`, 'drivers');
      } else {
        log(`Drivers · ${driver.profile.name} takes another trip`, 'drivers');
      }

      // --- 3. Driver drives to the pickup (Tracking service) ---
      dispatch({ type: 'STATUS', status: STATUS.ARRIVING, target: PICKUP });
      log('Tracking · streaming driver location to pickup…', 'tracking');
      let leg = await animateLeg(DRIVER_START, PICKUP, cfg.arriveMs, driver.profile.id, {
        failTracking: fault === 'tracking_drop',
      });
      if (leg.cancelled) return;

      // --- 4. Customer picked up; ride Started (Tracking service) ---
      const km = haversineKm(PICKUP, DESTINATION);
      const fare = computeFare(km);
      dispatch({ type: 'FARE', fare });
      dispatch({ type: 'STATUS', status: STATUS.STARTED, target: DESTINATION });
      log(`Ride started · ${km.toFixed(1)} km to destination · est. fare ${fare} PKR`);
      leg = await animateLeg(PICKUP, DESTINATION, cfg.rideMs, driver.profile.id, {});
      if (leg.cancelled) return;

      // --- 5. Destination reached; ride Stopped ---
      dispatch({ type: 'STATUS', status: STATUS.STOPPED, target: DESTINATION });
      log('Destination reached · ride stopped');

      // --- 6. Customer pays; driver balance updates (Wallet service) ---
      dispatch({ type: 'STATUS', status: STATUS.PAYING, target: DESTINATION });
      const { standingBalance } = await payFare(apiClient, {
        fromWalletId: customer.walletId,
        toWalletId: driver.walletId,
        amount: fare,
        description: 'ride fare',
      });
      dispatch({ type: 'DRIVER_BALANCE', balance: standingBalance });
      const refreshed = await apiClient.getWallet(customer.walletId);
      dispatch({ type: 'CUSTOMER', customer: { ...customer, balance: refreshed.balance } });
      log(`Wallet · ${fare} PKR charged · driver standing balance now ${standingBalance} PKR`, 'wallet');

      dispatch({ type: 'DONE' });
      log('Ride complete', 'success');
    } catch (e) {
      dispatch({ type: 'FAIL', reason: e.message });
      log(`Failed · ${e.message}`, 'error');
    }
  }

  function reset() {
    cancelled.current = true;
    dispatch({ type: 'RESET' });
  }

  const m = meta(state.status);
  const currentStep = stepIndex(state.status);
  const driverXY = project(state.driverPos);
  const pickupXY = project(PICKUP);
  const destXY = project(DESTINATION);
  const targetXY = project(state.target);

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center gap-3 mb-3">
        <h1 className="h4 mb-0">mini-Careem · Ride Demo</h1>
        <span className={`badge bg-${m.variant}`} data-testid="status-badge">{m.label}</span>
      </div>

      {/* progress tracker across the happy path */}
      <div className="d-flex flex-wrap gap-1 mb-3">
        {HAPPY_PATH.map((s, idx) => {
          const done = currentStep > idx && state.status !== STATUS.FAILED;
          const active = currentStep === idx;
          const cls = state.status === STATUS.FAILED && active
            ? 'bg-danger'
            : active ? 'bg-primary' : done ? 'bg-success' : 'bg-light text-dark border';
          return (
            <span key={s} className={`badge ${cls}`}>{meta(s).label}</span>
          );
        })}
      </div>

      {state.status === STATUS.FAILED && (
        <div className="alert alert-danger" data-testid="fail-reason">
          <strong>Ride failed:</strong> {state.failReason}
        </div>
      )}

      <div className="row g-4">
        {/* --- map --- */}
        <div className="col-lg-7">
          <div className="border rounded bg-light position-relative" style={{ paddingTop: '72%' }}>
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="position-absolute top-0 start-0 w-100 h-100"
              data-testid="map"
            >
              {/* subtle grid so it reads as a map */}
              {[20, 40, 60, 80].map((g) => (
                <g key={g} stroke="#dee2e6" strokeWidth="0.2">
                  <line x1={g} y1="0" x2={g} y2="100" />
                  <line x1="0" y1={g} x2="100" y2={g} />
                </g>
              ))}

              {/* dashed route from driver to current target */}
              {!isTerminal(state.status) && state.status !== STATUS.IDLE && (
                <line
                  x1={driverXY.x} y1={driverXY.y} x2={targetXY.x} y2={targetXY.y}
                  stroke="#0d6efd" strokeWidth="0.4" strokeDasharray="1.5 1.2"
                />
              )}

              {/* pickup */}
              <circle cx={pickupXY.x} cy={pickupXY.y} r="1.8" fill="#198754" />
              <text x={pickupXY.x + 2.4} y={pickupXY.y + 1} fontSize="3" fill="#198754">Pickup</text>

              {/* destination */}
              <circle cx={destXY.x} cy={destXY.y} r="1.8" fill="#dc3545" />
              <text x={destXY.x + 2.4} y={destXY.y + 1} fontSize="3" fill="#dc3545">Destination</text>

              {/* driver */}
              {state.status !== STATUS.IDLE && (
                <g>
                  <circle cx={driverXY.x} cy={driverXY.y} r="2.2" fill="#0d6efd" stroke="#fff" strokeWidth="0.4" />
                  <text x={driverXY.x + 2.6} y={driverXY.y + 1} fontSize="3" fill="#0d6efd">Driver</text>
                </g>
              )}
            </svg>
          </div>

          <div className="d-flex gap-2 mt-3 align-items-center">
            <button
              className="btn btn-primary"
              onClick={runRide}
              disabled={state.running}
              data-testid="request-btn"
            >
              {state.running ? 'Ride in progress…' : 'Request ride'}
            </button>
            <button className="btn btn-outline-secondary" onClick={reset} data-testid="reset-btn">
              Reset
            </button>
            <div className="ms-auto">
              <label className="form-label small mb-0 me-2">Demo a failure:</label>
              <select
                className="form-select form-select-sm d-inline-block w-auto"
                value={state.fault}
                onChange={(e) => dispatch({ type: 'FAULT', fault: e.target.value })}
                disabled={state.running}
                data-testid="fault-select"
              >
                <option value="none">None (happy path)</option>
                <option value="no_driver">No driver available</option>
                <option value="tracking_drop">Tracking drops mid-route</option>
                <option value="insufficient_funds">Insufficient funds</option>
              </select>
            </div>
          </div>
        </div>

        {/* --- details --- */}
        <div className="col-lg-5">
          <div className="card mb-3">
            <div className="card-body">
              <h2 className="h6 card-title">Customer</h2>
              {state.customer ? (
                <p className="mb-0 small">
                  Wallet #{state.customer.walletId} · balance{' '}
                  <strong data-testid="customer-balance">{state.customer.balance}</strong> PKR
                </p>
              ) : (
                <p className="text-muted mb-0 small">No active request</p>
              )}
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 className="h6 card-title">Driver</h2>
              {state.driver ? (
                <>
                  <p className="mb-1 small">
                    {state.driver.profile.name} ·{' '}
                    {state.driver.profile.vehicle?.make || state.driver.profile.vehicle_type}
                  </p>
                  <p className="mb-0 small">
                    Standing balance:{' '}
                    <strong
                      className={state.status === STATUS.COMPLETE ? 'text-success' : ''}
                      data-testid="driver-balance"
                    >
                      {state.driver.standingBalance}
                    </strong>{' '}
                    PKR
                  </p>
                </>
              ) : (
                <p className="text-muted mb-0 small">No driver assigned</p>
              )}
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 className="h6 card-title">Trip</h2>
              <p className="mb-1 small">
                Fare: <strong data-testid="fare">{state.fare ?? '—'}</strong>{state.fare ? ' PKR' : ''}
              </p>
              <p className="mb-0 small">Live pings sent: {state.pings}</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h2 className="h6 card-title">Event log</h2>
              <ul className="list-unstyled small mb-0" data-testid="log" style={{ maxHeight: 220, overflowY: 'auto' }}>
                {state.log.length === 0 && <li className="text-muted">Nothing yet — request a ride.</li>}
                {state.log.map((e, i) => (
                  <li key={i} className={e.kind === 'error' ? 'text-danger' : e.kind === 'success' ? 'text-success' : ''}>
                    · {e.msg}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
