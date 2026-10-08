import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

const toDateKey = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA");
};

const AgentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const todayKey = useMemo(() => toDateKey(new Date()), []);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get("/driver/trips");
        setTrips(response.data.trips || []);
      } catch (error) {
        console.error("Driver dashboard error:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const todaysTrips = trips.filter(
    (trip) =>
      toDateKey(trip.date) === todayKey &&
      !["CANCELLED", "COMPLETED"].includes(String(trip.status).toUpperCase()),
  );

  const openBooking = (trip) => {
    navigate(`/agent/trips/${trip.tripId}/new-booking`, {
      state: { trip },
    });
  };

  return (
    <main className="page-container agent-dashboard">
      <section className="agent-hero">
        <div>
          <p className="eyebrow">DRIVER DASHBOARD</p>

          <h1>
            Good morning,
            {` ${user?.name?.split(" ")[0]}`}
          </h1>

          <p>Manage your assigned trips and passenger information.</p>
        </div>

        <div className="driver-avatar">
          {user?.name?.charAt(0)?.toUpperCase()}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">TODAY</p>
            <h2>Today's Trips</h2>
          </div>
          <Link to="/agent/trips" className="text-link">View all →</Link>
        </div>

        {loading ? (
          <div className="card today-trip-state">Loading today's trips...</div>
        ) : todaysTrips.length === 0 ? (
          <div className="card today-trip-state">
            <h3>No trips assigned for today</h3>
            <p>Your active trips for today will appear here for quick ticket booking.</p>
          </div>
        ) : (
          <div className="today-trip-list">
            {todaysTrips.map((trip) => (
              <article key={trip.tripId} className="today-trip-card">
                <div className="today-trip-main">
                  <span className="trip-label">TODAY</span>
                  <h3>{trip.route?.name || "Unknown Route"}</h3>
                  <p>{trip.departureTime || "—"} → {trip.arrivalTime || "—"} · {trip.vehicle?.vehicleNumber || "Vehicle not set"}</p>
                </div>
                <div className="today-trip-meta">
                  <span className="trip-status">{trip.status}</span>
                  {trip.status === "SCHEDULED" ? (
                    <button type="button" className="primary-button" onClick={() => openBooking(trip)}>
                      Book Ticket
                    </button>
                  ) : (
                    <Link to="/agent/trips" className="secondary-button">Open Trip</Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="agent-actions">
        <Link to="/agent/trips" className="agent-action-card">
          <div className="agent-action-icon">🚌</div>
          <div>
            <h3>My Trips</h3>
            <p>View your assigned trips and passenger lists.</p>
          </div>
          <span className="action-arrow">→</span>
        </Link>
      </section>

      <section className="agent-info-grid">
        <div className="card">
          <span className="info-label">ROLE</span>
          <h3>Driver / Agent</h3>
          <p>You can only access trips assigned to your account.</p>
        </div>

        <div className="card">
          <span className="info-label">PASSENGER ACCESS</span>
          <h3>Trip Based</h3>
          <p>Passenger information is available only for your assigned trips.</p>
        </div>
      </section>

      <section className="section-block">
        <div className="action-grid two-up">
          <Link to="/agent/daily-bookings" className="feature-card"><span className="feature-icon">▤</span><div><h3>Daily Bookings</h3><p>View all passenger and booking details for the day.</p></div><b>→</b></Link>
          <Link to="/agent/revenue" className="feature-card accent-card"><span className="feature-icon">₹</span><div><h3>Revenue</h3><p>Check your daily revenue and revenue per van.</p></div><b>→</b></Link>
        </div>
      </section>
    </main>
  );
};

export default AgentDashboard;
