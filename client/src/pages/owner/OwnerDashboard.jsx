import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

const OwnerDashboard = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const upcoming = trips.filter((trip) => ["DRAFT", "FARE_PENDING", "SCHEDULED"].includes(trip.status)).length;
  const farePending = trips.filter((trip) => trip.status === "FARE_PENDING").length;

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
