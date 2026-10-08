import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

const toDateKey = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA");
};

const OwnerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const todayKey = toDateKey(new Date());

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get("/trips");
        setTrips(response.data.trips || []);
      } catch (error) {
        console.error("Owner dashboard error:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const upcoming = trips.filter((trip) =>
    ["DRAFT", "FARE_PENDING", "SCHEDULED"].includes(trip.status),
  ).length;

  const farePending = trips.filter((trip) => trip.status === "FARE_PENDING").length;

  const todaysTrips = trips.filter(
    (trip) =>
      toDateKey(trip.date) === todayKey &&
      !["CANCELLED", "COMPLETED"].includes(String(trip.status).toUpperCase()),
  );

  const openBooking = (trip) => {
    navigate(`/owner/trips/${trip._id || trip.id}/new-booking`, {
      state: { trip },
    });
  };

  return (
    <main className="page-container owner-dashboard">
      <section className="backoffice-hero owner-hero">
        <div>
          <p className="eyebrow">OWNER PORTAL</p>
          <h1>Welcome back, {user?.name?.split(" ")[0] || "Owner"}.</h1>
          <p>Keep your fleet trips scheduled and fares ready for sale.</p>
        </div>
        <div className="hero-bus-art">▰</div>
      </section>

      <section className="stats-grid owner-stats">
        <div className="stat-card"><span>MY TRIPS</span><strong>{loading ? "—" : trips.length}</strong><small>Trips linked to your vehicles</small></div>
        <div className="stat-card"><span>UPCOMING</span><strong>{loading ? "—" : upcoming}</strong><small>Scheduled or preparing</small></div>
        <div className="stat-card"><span>FARE PENDING</span><strong>{loading ? "—" : farePending}</strong><small>Trips needing fare setup</small></div>
      </section>

      <section className="section-block">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">TODAY</p>
            <h2>Today's Trips</h2>
          </div>
          <Link to="/owner/trips" className="text-link">View all →</Link>
        </div>

        {loading ? (
          <div className="card today-trip-state">Loading today's trips...</div>
        ) : todaysTrips.length === 0 ? (
          <div className="card today-trip-state">
            <h3>No trips scheduled for today</h3>
            <p>Your active trips for today will appear here for quick ticket booking.</p>
          </div>
        ) : (
          <div className="today-trip-list">
            {todaysTrips.map((trip) => (
              <article key={trip._id || trip.id} className="today-trip-card">
                <div className="today-trip-main">
                  <span className="trip-label">TODAY</span>
                  <h3>{trip.route?.name || trip.routeName || "Unknown Route"}</h3>
                  <p>{trip.departureTime || "—"} → {trip.arrivalTime || "—"} · {trip.vehicle?.vehicleNumber || "Vehicle not set"}</p>
                </div>
                <div className="today-trip-meta">
                  <span className="trip-status">{trip.status}</span>
                  {trip.status === "SCHEDULED" ? (
                    <button type="button" className="primary-button" onClick={() => openBooking(trip)}>
                      Book Ticket
                    </button>
                  ) : (
                    <Link
                      to={trip.status === "FARE_PENDING"
                        ? `/owner/trips/${trip._id || trip.id}/fares`
                        : "/owner/trips"}
                      className="secondary-button"
                    >
                      {trip.status === "FARE_PENDING" ? "Set Fares" : "Open Trip"}
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="section-heading-row"><div><p className="eyebrow">OPERATIONS</p><h2>Owner workspace</h2></div><Link to="/owner/trips" className="text-link">View all →</Link></div>
        <div className="action-grid two-up">
          <Link to="/owner/trips" className="feature-card"><span className="feature-icon">▣</span><div><h3>My Trips</h3><p>Review trips assigned to your vehicles.</p></div><b>→</b></Link>
          <Link to="/owner/daily-bookings" className="feature-card"><span className="feature-icon">▤</span><div><h3>Daily Bookings</h3><p>See every booking and passenger detail for a day.</p></div><b>→</b></Link>
          <Link to="/owner/vans" className="feature-card"><span className="feature-icon">🚌</span><div><h3>All Vans</h3><p>Open any van and view its bookings by date.</p></div><b>→</b></Link>
          <Link to="/owner/revenue" className="feature-card accent-card"><span className="feature-icon">₹</span><div><h3>Revenue</h3><p>Check daily revenue and revenue per van.</p></div><b>→</b></Link>
          <Link to={farePending && trips.find((trip) => trip.status === "FARE_PENDING") ? `/owner/trips/${trips.find((trip) => trip.status === "FARE_PENDING")._id || trips.find((trip) => trip.status === "FARE_PENDING").id}/fares` : "/owner/trips"} className="feature-card accent-card"><span className="feature-icon">₹</span><div><h3>Fare Management</h3><p>Configure segment fares for trips.</p></div><b>→</b></Link>
        </div>
      </section>
    </main>
  );
};

export default OwnerDashboard;
