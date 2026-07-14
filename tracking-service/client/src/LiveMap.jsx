import { useEffect, useState } from 'react';
import { fetchPings, sendPing } from './api';
import { project } from './geo';

// The live map. Polls the Tracking API every few seconds and redraws every
// driver that still has a fresh ping. Drivers whose pings have expired in Redis
// simply disappear on the next poll -- exactly the ephemeral behaviour we want.
export default function LiveMap({ pollMs = 3000 }) {
  const [pings, setPings] = useState([]);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ driverId: 'driver-1', lat: 24.86, lng: 67.0 });

  async function refresh() {
    try {
      setPings(await fetchPings());
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [pollMs]);

  async function onSubmit(e) {
    e.preventDefault();
    await sendPing(form.driverId, Number(form.lat), Number(form.lng));
    refresh();
  }

  return (
    <div className="container py-4">
      <h1 className="h4 mb-3">mini-Careem · Live Tracking</h1>
      {error && <div className="alert alert-warning">Can't reach tracking service: {error}</div>}

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="border rounded bg-light position-relative" style={{ paddingTop: '75%' }}>
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="position-absolute top-0 start-0 w-100 h-100"
              data-testid="map"
            >
              {pings.map((p) => {
                const { x, y } = project(p);
                return (
                  <g key={p.driverId}>
                    <circle cx={x} cy={y} r="1.6" fill="#0d6efd" />
                    <text x={x + 2} y={y} fontSize="2.5" fill="#212529">
                      {p.driverId}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="col-lg-5">
          <h2 className="h6">Live drivers ({pings.length})</h2>
          <table className="table table-sm">
            <thead>
              <tr><th>Driver</th><th>Lat</th><th>Lng</th></tr>
            </thead>
            <tbody>
              {pings.map((p) => (
                <tr key={p.driverId}>
                  <td>{p.driverId}</td>
                  <td>{p.lat}</td>
                  <td>{p.lng}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <form onSubmit={onSubmit} className="mt-3">
            <h2 className="h6">Simulate a ping</h2>
            <div className="mb-2">
              <input
                className="form-control form-control-sm"
                aria-label="driverId"
                value={form.driverId}
                onChange={(e) => setForm({ ...form, driverId: e.target.value })}
              />
            </div>
            <div className="row g-2 mb-2">
              <div className="col">
                <input
                  className="form-control form-control-sm"
                  aria-label="lat"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                />
              </div>
              <div className="col">
                <input
                  className="form-control form-control-sm"
                  aria-label="lng"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                />
              </div>
            </div>
            <button className="btn btn-primary btn-sm" type="submit">Send ping</button>
          </form>
        </div>
      </div>
    </div>
  );
}
