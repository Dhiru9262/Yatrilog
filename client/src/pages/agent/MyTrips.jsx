import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import api from "../../api/axios";

const MyTrips = () => {
  const navigate = useNavigate();

  const [trips, setTrips] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const toggleRunning = async (trip) => {
    try {
      const next = trip.status === "CANCELLED" || trip.isRunning === false;
      await api.patch(`/trips/${trip.tripId}/running`, { isRunning: next });
      const response = await api.get("/driver/trips");
      setTrips(response.data.trips || []);
    } catch (error) { setError(error.response?.data?.message || "Unable to update trip availability"); }
  };

  useEffect(() => {
    const loadTrips = async () => {
      try {
        const response = await api.get("/driver/trips");

        setTrips(response.data.trips || []);
      } catch (error) {
        console.error(error);

        setError(error.response?.data?.message || "Unable to load trips");
      } finally {
        setLoading(false);
      }
    };

    loadTrips();
  }, []);

  if (loading) {
    return <div>Loading your trips...</div>;
  }

  return (
    <main className="page-container trips-page">
      <div className="page-heading">
        <p className="eyebrow">DRIVER PORTAL</p>

        <h1>My Assigned Trips</h1>

        <p>View your scheduled journeys and passenger information.</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {trips.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🚌</div>

          <h3>No trips assigned</h3>

          <p>Your assigned trips will appear here.</p>
        </div>
      ) : (
        <div className="driver-trip-list">
          {trips.map((trip) => (
            <article className="driver-trip-card" key={trip.tripId}>
              {/* ===================== */}
              {/* HEADER */}
              {/* ===================== */}

              <div className="driver-trip-header">
                <div>
                  <span className="trip-label">ROUTE</span>

                  <h2>{trip.route.name}</h2>
                </div>

                <span className="trip-status">{trip.status}</span>
              </div>

              {/* ===================== */}
              {/* ROUTE */}
              {/* ===================== */}

              <div className="driver-route">
                <div>
                  <span>DEPARTURE</span>

                  <strong>{trip.departureTime}</strong>
                </div>

                <div className="driver-route-line">→</div>

                <div>
                  <span>ARRIVAL</span>

                  <strong>{trip.arrivalTime}</strong>
                </div>
              </div>

              {/* ===================== */}
              {/* DETAILS */}
              {/* ===================== */}

              <div className="driver-trip-details">
                <div>
                  <span>DATE</span>

                  <strong>{new Date(trip.date).toLocaleDateString()}</strong>
                </div>

                <div>
                  <span>VEHICLE</span>

                  <strong>{trip.vehicle?.vehicleNumber}</strong>
                </div>

                <div>
                  <span>TYPE</span>

                  <strong>{trip.vehicle?.type}</strong>
                </div>
              </div>

              {/* ===================== */}
              {/* ACTION */}
              {/* ===================== */}

              <div className="driver-trip-footer">
                <button className="secondary-button" onClick={() => toggleRunning(trip)}>
                  {trip.status === "CANCELLED" || trip.isRunning === false ? "Mark Running" : "Mark Not Running"}
                </button>
                <button
                  className="secondary-button"
                  onClick={() =>
                    navigate(`/agent/trips/${trip.tripId}/passengers`)
                  }
                >
                  View Passengers
                </button>

                {trip.status === "SCHEDULED" && (
                  <button
                    className="primary-button"
                    onClick={() =>
                      navigate(`/agent/trips/${trip.tripId}/new-booking`, {
                        state: {
                          trip,
                        },
                      })
                    }
                  >
                    + New Booking
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
};

export default MyTrips;
