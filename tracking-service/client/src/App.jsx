import { useState } from 'react';
import LiveMap from './LiveMap';
import RideDemo from './RideDemo';

// Two demos in one app, switched by a simple tab bar:
//  - Ride Demo: the full ride lifecycle across all three services (the headline)
//  - Live Map:  the raw tracking feed (drivers + their latest pings)
export default function App() {
  const [tab, setTab] = useState('ride');

  return (
    <div>
      <nav className="navbar navbar-expand bg-dark" data-bs-theme="dark">
        <div className="container">
          <span className="navbar-brand">mini-Careem</span>
          <ul className="navbar-nav">
            <li className="nav-item">
              <button
                className={`nav-link btn btn-link ${tab === 'ride' ? 'active' : ''}`}
                onClick={() => setTab('ride')}
              >
                Ride Demo
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link btn btn-link ${tab === 'map' ? 'active' : ''}`}
                onClick={() => setTab('map')}
              >
                Live Map
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {tab === 'ride' ? <RideDemo /> : <LiveMap />}
    </div>
  );
}
