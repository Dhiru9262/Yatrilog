import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import api from "../../api/axios";

const OwnerFareManagement = () => {
  const { tripId } = useParams();

  const [trip, setTrip] = useState(null);
  const [fares, setFares] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ======================================
  // LOAD TRIP + FARES
  // ======================================

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        // Load trip
        const tripResponse = await api.get(`/trips/${tripId}`);

        setTrip(tripResponse.data.trip);

        // Load fare configuration
        const fareResponse = await api.get(`/fares/trip/${tripId}`);

        setFares(fareResponse.data.fares || []);
      } catch (error) {
        console.error("Load fare management error:", error);

        setError(
          error.response?.data?.message || "Unable to load trip and fares",
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tripId]);

  // ======================================
  // CHANGE FARE
  // ======================================

  const handleFareChange = (fromStopId, toStopId, value) => {
    setFares((currentFares) =>
      currentFares.map((fare) => {
        if (fare.fromStop?.id === fromStopId && fare.toStop?.id === toStopId) {
          return {
            ...fare,

            amount: value === "" ? null : Number(value),
          };
        }

        return fare;
      }),
    );
  };

  // ======================================
  // SAVE FARES
  // ======================================

  const handleSave = async () => {
    setError("");
    setSuccess("");

    // ----------------------------------
    // Validate all fares
    // ----------------------------------

    for (const fare of fares) {
      if (
        fare.amount === null ||
        fare.amount === "" ||
        Number(fare.amount) < 0
      ) {
        setError(
          `Please enter a valid fare for ${fare.fromStop.name} → ${fare.toStop.name}`,
        );

        return;
      }
    }

    try {
      setSaving(true);

      // ----------------------------------
      // Prepare backend payload
      // ----------------------------------

      const payload = {
        fares: fares.map((fare) => ({
          fromStop: fare.fromStop.id,

          toStop: fare.toStop.id,

          amount: Number(fare.amount),
        })),
      };

      // ----------------------------------
      // Save fares
      // ----------------------------------

      const response = await api.put(`/fares/trip/${tripId}`, payload);

      // ----------------------------------
      // Update trip status from backend
      // ----------------------------------

      setTrip((currentTrip) => ({
        ...currentTrip,

        status: response.data.tripStatus || currentTrip.status,
      }));

      // ----------------------------------
      // Show backend message
      // ----------------------------------

      setSuccess(response.data.message || "Fares saved successfully.");

      // ----------------------------------
      // Reload fares
      // ----------------------------------

      const fareResponse = await api.get(`/fares/trip/${tripId}`);

      setFares(fareResponse.data.fares || []);
    } catch (error) {
      console.error("Save fares error:", error);

      setError(error.response?.data?.message || "Unable to save fares");
    } finally {
      setSaving(false);
    }
  };

  // ======================================
  // LOADING
  // ======================================

  if (loading) {
    return (
      <main className="page-container">
        <div className="loading-state">Loading fare management...</div>
      </main>
    );
  }

  // ======================================
  // TRIP NOT FOUND
  // ======================================

  if (!trip) {
    return (
      <main className="page-container">
        <div className="error-message">Trip not found</div>
      </main>
    );
  }

  const canEditFares = trip.status !== "CANCELLED";
  // ======================================
  // RENDER
  // ======================================

  return (
    <main className="page-container">
      {/* ================================== */}
      {/* PAGE HEADING */}
      {/* ================================== */}

      <div className="page-heading">
        <p className="eyebrow">OWNER PORTAL</p>

        <h1>Fare Management</h1>

        <p>Set fares once for this route. All your vans and future trips on this route use these prices.</p>
      </div>

      {/* ================================== */}
      {/* TRIP INFORMATION */}
      {/* ================================== */}

      <section className="card fare-trip-summary">
        <h2>{trip.route?.name || "Route"}</h2>

        <div className="owner-trip-details">
          <div>
            <span>DATE</span>

            <strong>
              {trip.date ? new Date(trip.date).toLocaleDateString() : "-"}
            </strong>
          </div>

          <div>
            <span>VEHICLE</span>

            <strong>{trip.vehicle?.vehicleNumber || "-"}</strong>
          </div>

          <div>
            <span>DRIVER</span>

            <strong>{trip.driver?.name || "-"}</strong>
          </div>

          <div>
            <span>STATUS</span>

            <strong>{trip.status}</strong>
          </div>
        </div>
      </section>

      {/* ================================== */}
      {/* ERROR */}
      {/* ================================== */}

      {error && <div className="error-message">{error}</div>}

      {/* ================================== */}
      {/* SUCCESS */}
      {/* ================================== */}

      {success && <div className="success-message">{success}</div>}

      {/* ================================== */}
      {/* FARE TABLE */}
      {/* ================================== */}

      <section className="card fare-management-card">
        <div className="fare-table-header">
          <span>FROM</span>

          <span>TO</span>

          <span>FARE</span>
        </div>

        {fares.length === 0 ? (
          <div className="empty-state">
            <h3>No fare combinations found</h3>

            <p>This route does not have any fare combinations yet.</p>
          </div>
        ) : (
          fares.map((fare) => (
            <div
              className="fare-row"
              key={`${fare.fromStop.id}-${fare.toStop.id}`}
            >
              {/* FROM */}

              <span>{fare.fromStop.name}</span>

              {/* TO */}

              <span>{fare.toStop.name}</span>

              {/* FARE */}

              <div className="fare-input">
                <span>₹</span>

                <input
                  type="number"
                  min="0"
                  value={fare.amount ?? ""}
                  disabled={!canEditFares}
                  onChange={(event) =>
                    handleFareChange(
                      fare.fromStop.id,
                      fare.toStop.id,
                      event.target.value,
                    )
                  }
                  placeholder="Enter fare"
                />
              </div>
            </div>
          ))
        )}

        {/* ================================== */}
        {/* ACTIONS */}
        {/* ================================== */}

        <div className="fare-actions">
          <Link to="/owner/trips" className="secondary-button">
            Back to Trips
          </Link>

          {canEditFares && (
            <button
              type="button"
              className="primary-button"
              onClick={handleSave}
              disabled={saving || fares.length === 0}
            >
              {saving ? "Saving..." : "Save Fares"}
            </button>
          )}

          {!canEditFares && (
            <div className="fare-locked-message">
              Fares cannot be edited through a cancelled trip.
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default OwnerFareManagement;
