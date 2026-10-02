import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

const AgentDashboard = () => {
  const { user } = useAuth();

  return (
    <main className="page-container agent-dashboard">
      {/* ================================= */}
      {/* HERO */}
      {/* ================================= */}

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

      {/* ================================= */}
      {/* QUICK ACTION */}
      {/* ================================= */}

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

      {/* ================================= */}
      {/* INFORMATION */}
      {/* ================================= */}

      <section className="agent-info-grid">
        <div className="card">
          <span className="info-label">ROLE</span>

          <h3>Driver / Agent</h3>

          <p>You can only access trips assigned to your account.</p>
        </div>

        <div className="card">
          <span className="info-label">PASSENGER ACCESS</span>

          <h3>Trip Based</h3>

          <p>
            Passenger information is available only for your assigned trips.
          </p>
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
