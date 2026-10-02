import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ routes: 0, vehicles: 0, drivers: 0, trips: 0 });

  useEffect(() => {
    Promise.all([api.get("/routes"), api.get("/vehicles"), api.get("/users/drivers"), api.get("/trips")])
      .then(([routes, vehicles, drivers, trips]) => {
        setStats({
          routes: routes.data.routes?.length || 0,
          vehicles: vehicles.data.vehicles?.length || 0,
          drivers: drivers.data.drivers?.length || 0,
          trips: trips.data.trips?.length || 0,
        });
      })
      .catch((error) => console.error("Admin dashboard stats error:", error));
  }, []);

  return (
    <main className="page-container admin-dashboard">
      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <section className="admin-hero">
        <div>
          <p className="eyebrow">ADMIN PORTAL</p>

          <h1>
            Welcome back,
            {` ${user?.name?.split(" ")[0]}`}
          </h1>

          <p>
            Manage routes, vehicles, drivers, trips and bookings from one place.
          </p>
        </div>

        <div className="admin-avatar">
          {user?.name?.charAt(0)?.toUpperCase()}
        </div>
      </section>

      <section className="stats-grid admin-stats">
        <div className="stat-card"><span>ROUTES</span><strong>{stats.routes}</strong><small>Configured routes</small></div>
        <div className="stat-card"><span>VEHICLES</span><strong>{stats.vehicles}</strong><small>Fleet vehicles</small></div>
        <div className="stat-card"><span>DRIVERS</span><strong>{stats.drivers}</strong><small>Registered drivers</small></div>
        <div className="stat-card"><span>TRIPS</span><strong>{stats.trips}</strong><small>Trips in the system</small></div>
      </section>

      {/* ================================= */}
      {/* MANAGEMENT */}
      {/* ================================= */}

      <section className="admin-section">
        <div className="section-title">
          <p className="eyebrow">MANAGEMENT</p>

          <h2>Operations</h2>
        </div>

        <div className="admin-grid">
          {/* ROUTES */}

          <Link to="/admin/routes" className="admin-card">
            <div className="admin-card-icon">🗺️</div>

            <div>
              <h3>Routes & Stops</h3>

              <p>Manage routes, boarding stops and dropping stops.</p>
            </div>

            <span>→</span>
          </Link>

          {/* VEHICLES */}

          <Link to="/admin/vehicles" className="admin-card">
            <div className="admin-card-icon">🚌</div>

            <div>
              <h3>Vehicles</h3>

              <p>Add and manage buses and their seat layouts.</p>
            </div>

            <span>→</span>
          </Link>

          <Link to="/admin/seat-layout" className="admin-card">
            <div className="admin-card-icon">💺</div>
            <div>
              <h3>Seat Layout Designer</h3>
              <p>Design each van with a responsive drag-and-drop canvas.</p>
            </div>
            <span>→</span>
          </Link>

          {/* DRIVERS */}

          <Link to="/admin/drivers" className="admin-card">
            <div className="admin-card-icon">👨‍✈️</div>

            <div>
              <h3>Drivers</h3>

              <p>View drivers and manage their assignments.</p>
            </div>

            <span>→</span>
          </Link>

          {/* TRIPS */}

          <Link to="/admin/trips" className="admin-card">
            <div className="admin-card-icon">📅</div>

            <div>
              <h3>Trips</h3>

              <p>Schedule trips and assign vehicles and drivers.</p>
            </div>

            <span>→</span>
          </Link>

        </div>
      </section>

      {/* ================================= */}
      {/* QUICK INFO */}
      {/* ================================= */}

      <section className="admin-info-grid">
        <div className="card">
          <span className="info-label">ACCESS LEVEL</span>

          <h3>Administrator</h3>

          <p>You have access to the transport management system.</p>
        </div>

        <div className="card">
          <span className="info-label">SYSTEM</span>

          <h3>Transport Operations</h3>

          <p>Manage the complete journey from route creation to booking.</p>
        </div>
      </section>
    </main>
  );
};

export default AdminDashboard;
