import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../../api/axios";

const OwnerTrips = () => {
  const [trips, setTrips] = useState([]);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const toggleRunning = async (trip) => {
    try {
      const next = trip.status === "CANCELLED" || trip.isRunning === false;
      await api.patch(`/trips/${trip._id || trip.id}/running`, { isRunning: next });
      const response = await api.get("/trips");
      setTrips(response.data.trips || []);
    } catch (error) { setError(error.response?.data?.message || "Unable to update trip availability"); }
  };

  useEffect(() => {
    const loadTrips = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/trips");

        setTrips(response.data.trips || []);
      } catch (error) {
        console.error("Load owner trips error:", error);

        setError(error.response?.data?.message || "Unable to load trips");
      } finally {
        setLoading(false);
      }
    };

    loadTrips();
  }, []);

  if (loading) {
    return (
      <main className="page-container">
        <div className="loading-state">Loading trips...</div>
      </main>
    );
  }

  return (
    <main className="page-container">
      <div className="page-heading">
        <p className="eyebrow">OWNER PORTAL</p>

        <h1>My Trips</h1>

        <p>Manage your trips and configure journey fares.</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {trips.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🚌</div>

          <h3>No trips found</h3>

          <p>Trips assigned to your vehicles will appear here.</p>
        </div>
      ) : (
        <div className="owner-trip-list">
          {trips.map((trip) => (
            <article className="owner-trip-card" key={trip._id || trip.id}>
              <div className="owner-trip-header">
                <div>
                  <span className="trip-label">ROUTE</span>

                  <h2>
                    {trip.route?.name || trip.routeName || "Unknown Route"}
                  </h2>
                </div>

                <span className="trip-status">{trip.status}</span>
              </div>

              <div className="owner-trip-details">
                <div>
                  <span>DATE</span>

                  <strong>
                    {trip.date ? new Date(trip.date).toLocaleDateString() : "-"}
                  </strong>
                </div>

                <div>
                  <span>DEPARTURE</span>

                  <strong>{trip.departureTime || "-"}</strong>
                </div>

                <div>
                  <span>ARRIVAL</span>

                  <strong>{trip.arrivalTime || "-"}</strong>
                </div>

                <div>
                  <span>VEHICLE</span>

                  <strong>{trip.vehicle?.vehicleNumber || "-"}</strong>
                </div>

                <div>
                  <span>DRIVER</span>

                  <strong>{trip.driver?.name || "-"}</strong>
                </div>
              </div>

              <div className="owner-trip-footer">
                <button className="secondary-button" type="button" onClick={() => toggleRunning(trip)}>
                  {trip.status === "CANCELLED" || trip.isRunning === false ? "Mark Running" : "Mark Not Running"}
                </button>
                {trip.status === "FARE_PENDING" && (
                  <Link
                    to={`/owner/trips/${trip._id || trip.id}/fares`}
                    className="primary-button"
                  >
                    Manage Fares
                  </Link>
                )}

                {trip.status === "SCHEDULED" && (
                  <Link
                    to={`/owner/trips/${trip._id || trip.id}/fares`}
                    className="secondary-button"
                  >
                    View / Edit Route Fares
                  </Link>
                )}
                {trip.status === "SCHEDULED" && (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() =>
                      navigate(`/owner/trips/${trip._id || trip.id}/new-booking`, {
                        state: { trip },
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

export default OwnerTrips;
