import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import api from "../../api/axios";
import SeatMap from "../../components/SeatMap";

const NewBooking = () => {
  const { tripId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";

  const [trip, setTrip] = useState(location.state?.trip || null);

  const [seats, setSeats] = useState([]);

  const [loading, setLoading] = useState(!trip);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const [form, setForm] = useState({
    passengerName: "",
    passengerPhone: "",
    passengerEmail: "",
    boardingStop: "",
    droppingStop: "",
    seatNumbers: [],
    paymentMethod: "CASH",
  });

  // ======================================
  // LOAD TRIP IF PAGE DIRECTLY OPENED
  // ======================================

  useEffect(() => {
    if (trip) {
      return;
    }

    const loadTrip = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(isOwner ? "/trips" : "/driver/trips");

        const foundTrip = (response.data.trips || []).find(
          (item) => String(item.tripId) === String(tripId),
        );

        if (!foundTrip) {
          setError("Trip not found");
          return;
        }

        setTrip(foundTrip);
      } catch (error) {
        console.error("Load trip error:", error);

        setError(error.response?.data?.message || "Unable to load trip");
      } finally {
        setLoading(false);
      }
    };

    loadTrip();
  }, [trip, tripId]);

  // ======================================
  // FORM CHANGE
  // ======================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    // When journey changes, clear selected seats.
    if (name === "boardingStop" || name === "droppingStop") {
      setForm((current) => ({
        ...current,
        [name]: value,
        seatNumbers: [],
      }));
    }
  };

  // ======================================
  // LOAD SEAT AVAILABILITY
  // ======================================

  const loadSeats = async () => {
    if (!form.boardingStop || !form.droppingStop) {
      setSeats([]);
      return;
    }

    try {
      setLoadingSeats(true);
      setError("");

      const response = await api.get(`/trips/${tripId}/seats`, {
        params: {
          fromStop: form.boardingStop,
          toStop: form.droppingStop,
        },
      });

      setSeats(response.data?.seats || []);

      // Always refresh the driver booking screen from the canonical vehicle layout
      // returned by the seat-availability API. This prevents stale trip state from
      // rendering an older/default seat arrangement.
      if (response.data?.seatLayout) {
        setTrip((current) => current ? ({
          ...current,
          vehicle: {
            ...(current.vehicle || {}),
            seatLayout: response.data.seatLayout,
          },
        }) : current);
      }

      // Remove seats that are no longer available.
      const availableSeatNumbers = new Set(
        (response.data?.seats || [])
          .filter((seat) => seat.status === "AVAILABLE")
          .map((seat) => String(seat.seatNumber)),
      );

      setForm((current) => ({
        ...current,
        seatNumbers: current.seatNumbers.filter((seatNumber) =>
          availableSeatNumbers.has(String(seatNumber)),
        ),
      }));
    } catch (error) {
      console.error("Load seats error:", error);

      setSeats([]);

      setError(error.response?.data?.message || "Unable to load seats");
    } finally {
      setLoadingSeats(false);
    }
  };

  useEffect(() => {
    loadSeats();
  }, [tripId, form.boardingStop, form.droppingStop]);

  // ======================================
  // SELECT / UNSELECT SEAT
  // ======================================

  const handleSeatSelect = (seat) => {
    if (seat.status !== "AVAILABLE") {
      return;
    }

    const seatNumber = String(seat.seatNumber);

    setForm((current) => {
      const alreadySelected = current.seatNumbers.includes(seatNumber);

      return {
        ...current,
        seatNumbers: alreadySelected
          ? current.seatNumbers.filter((item) => item !== seatNumber)
          : [...current.seatNumbers, seatNumber],
      };
    });
  };

  // ======================================
  // FARE
  // ======================================

  /*
   * The backend calculates the exact fare for
   * the selected journey.
   *
   * Seat availability does not currently return
   * fare, so we do not guess the fare here.
   *
   * The backend response after booking contains
   * the actual fare for each booking.
   */

  // ======================================
  // SUBMIT BOOKING
  // ======================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    // Name, phone and email are optional for operator bookings.
    // Journey and seat information remain mandatory.

    if (!form.boardingStop || !form.droppingStop) {
      setError("Please select boarding and dropping stops");
      return;
    }

    if (form.seatNumbers.length === 0) {
      setError("Please select at least one seat");
      return;
    }

    try {
      setSaving(true);

      const response = await api.post(`/driver/trips/${tripId}/bookings`, {
        passengerName: form.passengerName,
        passengerPhone: form.passengerPhone,
        passengerEmail: form.passengerEmail,
        boardingStop: form.boardingStop,
        droppingStop: form.droppingStop,
        seatNumbers: form.seatNumbers,
        paymentMethod: form.paymentMethod,
      });

      setSuccess(response.data.booking);

      // Clear form after successful booking.
      setForm({
        passengerName: "",
        passengerPhone: "",
        passengerEmail: "",
        boardingStop: "",
        droppingStop: "",
        seatNumbers: [],
        paymentMethod: "CASH",
      });

      // Reload seat status.
      await loadSeats();
    } catch (error) {
      console.error("Offline booking error:", error);

      setError(error.response?.data?.message || "Unable to create booking");

      // Reload because another booking may have taken
      // the selected seat.
      await loadSeats();
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
        <div className="loading-state">Loading trip...</div>
      </main>
    );
  }

  // ======================================
  // TRIP NOT FOUND
  // ======================================

  if (!trip) {
    return (
      <main className="page-container">
        <div className="error-message">{error || "Trip not found"}</div>
      </main>
    );
  }

  const stops = [...(trip.route?.stops || [])].sort(
    (a, b) => a.sequence - b.sequence,
  );

  const availableCount = seats.filter(
    (seat) => seat.status === "AVAILABLE",
  ).length;

  const bookedCount = seats.filter((seat) => seat.status === "BOOKED").length;

  const lockedCount = seats.filter((seat) => seat.status === "LOCKED").length;

  return (
    <main className="page-container agent-booking-page">
      {/* ======================================
          HEADER
          ====================================== */}

      <div className="page-heading">
        <button
          type="button"
          className="back-button"
          onClick={() => navigate("/agent/trips")}
        >
          ← My Trips
        </button>

        <p className="eyebrow">OFFLINE BOOKING</p>

        <h1>New Passenger Booking</h1>

        <p>
          {trip.route?.name}
          {" · "}
          {new Date(trip.date).toLocaleDateString()}
          {" · "}
          {trip.departureTime}
        </p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* ======================================
          SUCCESS
          ====================================== */}

      {success && (
        <section className="card booking-success-card">
          <div className="success-icon">✓</div>

          <p className="eyebrow">BOOKING CONFIRMED</p>

          <h2>Booking Successful</h2>

          <div className="booking-success-details">
            <div>
              <span>Booking(s)</span>

              <strong>
                {Array.isArray(success.bookings) ? success.bookings.length : 1}
              </strong>
            </div>

            <div>
              <span>Passenger</span>

              <strong>{success.passengerName || "-"}</strong>
            </div>

            <div>
              <span>Seats</span>

              <strong>
                {Array.isArray(success.bookings)
                  ? success.bookings.map((item) => item.seatNumber).join(", ")
                  : success.seatNumber || "-"}
              </strong>
            </div>

            <div>
              <span>Total Fare</span>

              <strong>₹{success.totalFare ?? success.fare ?? 0}</strong>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate(`/agent/trips/${tripId}/passengers`)}
            >
              View Passengers
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() => setSuccess(null)}
            >
              New Booking
            </button>
          </div>
        </section>
      )}

      {/* ======================================
          BOOKING FORM
          ====================================== */}

      {!success && (
        <section className="card">
          <form onSubmit={handleSubmit}>
            {/* ==================================
                PASSENGER
                ================================== */}

            <div className="form-section">
              <p className="eyebrow">PASSENGER</p>

              <h2>Passenger Details</h2>

              <div className="form-grid">
                <div className="input-group">
                  <label>Full Name</label>

                  <input
                    name="passengerName"
                    value={form.passengerName}
                    onChange={handleChange}
                    placeholder="Enter passenger name"
                  />
                </div>

                <div className="input-group">
                  <label>Phone</label>

                  <input
                    name="passengerPhone"
                    value={form.passengerPhone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="input-group">
                  <label>
                    Email <span>(optional)</span>
                  </label>

                  <input
                    type="email"
                    name="passengerEmail"
                    value={form.passengerEmail}
                    onChange={handleChange}
                    placeholder="Enter email"
                  />
                </div>
              </div>
            </div>

            {/* ==================================
                JOURNEY
                ================================== */}

            <div className="form-section">
              <p className="eyebrow">JOURNEY</p>

              <h2>Select Journey</h2>

              <div className="form-grid">
                <div className="input-group">
                  <label>Boarding Stop</label>

                  <select
                    name="boardingStop"
                    value={form.boardingStop}
                    onChange={handleChange}
                  >
                    <option value="">Select boarding stop</option>

                    {stops.map((stop) => (
                      <option key={stop._id} value={stop._id}>
                        {stop.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Dropping Stop</label>

                  <select
                    name="droppingStop"
                    value={form.droppingStop}
                    onChange={handleChange}
                  >
                    <option value="">Select dropping stop</option>

                    {stops
                      .filter((stop) => {
                        if (!form.boardingStop) {
                          return true;
                        }

                        const boarding = stops.find(
                          (item) =>
                            String(item._id) === String(form.boardingStop),
                        );

                        return !boarding || stop.sequence > boarding.sequence;
                      })
                      .map((stop) => (
                        <option key={stop._id} value={stop._id}>
                          {stop.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ==================================
                SEAT MAP
                ================================== */}

            <div className="form-section">
              <p className="eyebrow">SEAT MAP</p>

              <h2>Select Seats</h2>

              {!form.boardingStop || !form.droppingStop ? (
                <p className="form-help">
                  Select boarding and dropping stops first.
                </p>
              ) : loadingSeats ? (
                <p className="form-help">Loading seat availability...</p>
              ) : seats.length === 0 ? (
                <p className="form-help">No seats found for this vehicle.</p>
              ) : (
                <>
                  {/* LEGEND */}

                  <div className="seat-status-legend">
                    <div>
                      <span className="seat-legend-dot available-dot" />
                      Available ({availableCount})
                    </div>

                    <div>
                      <span className="seat-legend-dot booked-dot" />
                      Booked ({bookedCount})
                    </div>

                    <div>
                      <span className="seat-legend-dot locked-dot" />
                      Locked ({lockedCount})
                    </div>

                    <div>
                      <span className="seat-legend-dot selected-dot" />
                      Selected ({form.seatNumbers.length})
                    </div>
                  </div>

                  {/* CANONICAL VAN SEAT MAP */}

                  <SeatMap
                    seats={seats}
                    layout={trip.vehicle?.seatLayout}
                    selectedSeats={form.seatNumbers}
                    onSeatSelect={handleSeatSelect}
                  />

                  {/* SELECTED */}

                  {form.seatNumbers.length > 0 && (
                    <div className="selected-seat-summary">
                      <strong>Selected Seats:</strong>

                      <span>{form.seatNumbers.join(", ")}</span>

                      <span>
                        {form.seatNumbers.length}{" "}
                        {form.seatNumbers.length === 1 ? "seat" : "seats"}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ==================================
                PAYMENT
                ================================== */}

            <div className="form-section">
              <p className="eyebrow">PAYMENT</p>

              <h2>Payment Method</h2>

              <select
                name="paymentMethod"
                value={form.paymentMethod}
                onChange={handleChange}
              >
                <option value="CASH">Cash</option>
                <option value="COUNTER">Counter</option>
              </select>
            </div>

            {/* ==================================
                ACTIONS
                ================================== */}

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => navigate("/agent/trips")}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={saving || form.seatNumbers.length === 0}
              >
                {saving
                  ? "Creating Booking..."
                  : `Confirm Booking${
                      form.seatNumbers.length > 0
                        ? ` (${form.seatNumbers.length} Seats)`
                        : ""
                    }`}
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
};

export default NewBooking;
