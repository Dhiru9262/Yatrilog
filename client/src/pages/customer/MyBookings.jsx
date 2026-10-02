import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../../api/axios";

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [cancellingId, setCancellingId] = useState(null);
  const [routeFilter, setRouteFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // ======================================
  // LOAD BOOKINGS
  // ======================================

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/customer/bookings");

      setBookings(response.data?.bookings || []);
    } catch (error) {
      console.error("Load bookings error:", error);

      setError(error.response?.data?.message || "Unable to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const filteredBookings = bookings.filter((booking) => {
    const routeName = booking.route?.name || "";
    const tripDate = booking.trip?.date
      ? new Date(booking.trip.date).toISOString().slice(0, 10)
      : "";
    const routeMatch = !routeFilter || routeName === routeFilter;
    const dateMatch = !dateFilter || tripDate === dateFilter;
    const statusMatch = !statusFilter || booking.status === statusFilter;
    return routeMatch && dateMatch && statusMatch;
  });

  const routeOptions = [...new Set(bookings.map((booking) => booking.route?.name).filter(Boolean))].sort();

  // ======================================
  // CANCEL ENTIRE TICKET
  // ======================================

  const handleCancel = async (booking) => {
    if (!booking?.id) {
      return;
    }

    const seats = booking.seats || [];

    const seatNumbers = seats
      .map((seat) => seat.seatNumber)
      .filter(Boolean)
      .join(", ");

    const totalFare = Number(booking.totalFare || 0);

    const confirmed = window.confirm(
      `Cancel this entire ticket?\n\nSeats: ${seatNumbers}\nTotal refund: ₹${totalFare}\n\nAll seats in this ticket will be cancelled.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancellingId(booking.id);

      setError("");

      const response = await api.post(
        `/customer/bookings/${booking.id}/cancel`,
      );

      alert(response.data?.message || "Ticket cancelled successfully.");

      await loadBookings();
    } catch (error) {
      console.error("Cancel ticket error:", error);

      setError(error.response?.data?.message || "Unable to cancel ticket");
    } finally {
      setCancellingId(null);
    }
  };

  // ======================================
  // LOADING
  // ======================================

  if (loading) {
    return (
      <main className="page-container">
        <div className="loading-state">Loading your bookings...</div>
      </main>
    );
  }

  // ======================================
  // PAGE
  // ======================================

  return (
    <main className="page-container bookings-page">
      <div className="page-heading">
        <p className="eyebrow">YOUR JOURNEY</p>

        <h1>My Bookings</h1>

        <p>View and manage your bus tickets.</p>
      </div>

      {/* ==================================
          ERROR
          ================================== */}

      {error && <div className="error-message">{error}</div>}

      {/* ==================================
          TICKET FILTERS
          ================================== */}

      {bookings.length > 0 && (
        <section className="ticket-filter-card">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">FILTER TICKETS</p>
              <h2>Find a ticket quickly</h2>
            </div>
            <span className="filter-result-count">{filteredBookings.length} result{filteredBookings.length === 1 ? "" : "s"}</span>
          </div>
          <div className="booking-filter-grid">
            <div className="input-group">
              <label htmlFor="ticket-route-filter">Route</label>
              <select id="ticket-route-filter" value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)} className="form-input">
                <option value="">All routes</option>
                {routeOptions.map((route) => <option key={route} value={route}>{route}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="ticket-date-filter">Travel date</label>
              <input id="ticket-date-filter" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="form-input" />
            </div>
            <div className="input-group">
              <label htmlFor="ticket-status-filter">Status</label>
              <select id="ticket-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-input">
                <option value="">All statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PENDING">Pending</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <button type="button" className="secondary-button booking-filter-clear" onClick={() => { setRouteFilter(""); setDateFilter(""); setStatusFilter(""); }}>
              Clear Filters
            </button>
          </div>
        </section>
      )}

      {/* ==================================
          EMPTY
          ================================== */}

      {!error && bookings.length === 0 && (
        <section className="empty-state">
          <div className="empty-icon">🎫</div>

          <h3>No bookings yet</h3>

          <p>Your bus tickets will appear here.</p>

          <Link to="/customer/search" className="primary-button">
            Search Trips
          </Link>
        </section>
      )}

      {/* ==================================
          BOOKINGS
          ================================== */}

      {filteredBookings.length > 0 && (
        <section className="booking-list">
          {filteredBookings.map((booking) => {
            const bookingId = booking.id || booking.bookingId || booking._id;

            const seats = Array.isArray(booking.seats) ? booking.seats : [];

            const seatNumbers = seats
              .map((seat) => seat.seatNumber)
              .filter(Boolean);

            const totalSeats = booking.totalSeats || seats.length || 1;

            const totalFare = Number(booking.totalFare || 0);

            const isCancelled = booking.status === "CANCELLED";

            const isCancelling = cancellingId === bookingId;

            return (
              <article
                className="booking-card"
                key={bookingId || booking.bookingNumber}
              >
                {/* ==========================
                      HEADER
                      ========================== */}

                <div className="booking-card-header">
                  <div>
                    <span className="trip-label">TICKET</span>

                    <h2>{booking.bookingNumber || "Booking"}</h2>
                  </div>

                  <span
                    className={`status-badge ${
                      booking.status === "CONFIRMED"
                        ? "status-confirmed"
                        : booking.status === "CANCELLED"
                          ? "status-cancelled"
                          : ""
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>

                {/* ==========================
                      ROUTE
                      ========================== */}

                <div className="booking-route">
                  <div>
                    <span>FROM</span>

                    <strong>{booking.boardingStop || "-"}</strong>
                  </div>

                  <span className="booking-route-arrow">→</span>

                  <div>
                    <span>TO</span>

                    <strong>{booking.droppingStop || "-"}</strong>
                  </div>
                </div>

                {/* ==========================
                      TRIP
                      ========================== */}

                <div className="booking-details-grid">
                  <div>
                    <span>ROUTE</span>

                    <strong>{booking.route?.name || "-"}</strong>
                  </div>

                  <div>
                    <span>DATE</span>

                    <strong>
                      {booking.trip?.date
                        ? new Date(booking.trip.date).toLocaleDateString()
                        : "-"}
                    </strong>
                  </div>

                  <div>
                    <span>DEPARTURE</span>

                    <strong>{booking.trip?.departureTime || "-"}</strong>
                  </div>

                  <div>
                    <span>SEATS</span>

                    <strong>{totalSeats}</strong>
                  </div>

                  <div>
                    <span>SEAT NUMBERS</span>

                    <strong>{seatNumbers.join(", ") || "-"}</strong>
                  </div>

                  <div>
                    <span>TOTAL FARE</span>

                    <strong>₹{totalFare}</strong>
                  </div>

                  <div>
                    <span>PAYMENT</span>

                    <strong>{booking.paymentStatus || "-"}</strong>
                  </div>
                </div>

                {/* ==========================
                      INDIVIDUAL SEAT BREAKDOWN
                      ========================== */}

                {seats.length > 0 && (
                  <div className="booking-seat-summary">
                    <div className="booking-seat-summary-header">
                      <span>SEAT</span>

                      <span>FARE</span>
                    </div>

                    {seats.map((seat, index) => (
                      <div
                        className="booking-seat-row"
                        key={seat.bookingId || `${seat.seatNumber}-${index}`}
                      >
                        <span>Seat {seat.seatNumber}</span>

                        <strong>₹{Number(seat.fare || 0)}</strong>
                      </div>
                    ))}
                  </div>
                )}

                {/* ==========================
                      DRIVER
                      ========================== */}

                {booking.driver && (
                  <div className="booking-driver">
                    <div>
                      <span>DRIVER</span>

                      <strong>
                        {booking.driver.name || "Assigned driver"}
                      </strong>
                    </div>

                    {booking.driver.phone && (
                      <a
                        href={`tel:${booking.driver.phone}`}
                        className="call-driver"
                      >
                        📞 Call Driver
                      </a>
                    )}
                  </div>
                )}

                {/* ==========================
                      ACTIONS
                      ========================== */}

                <div className="booking-card-footer">
                  {bookingId ? (
                    <Link
                      to={`/customer/bookings/${bookingId}`}
                      className="primary-button"
                    >
                      View Ticket
                    </Link>
                  ) : (
                    <button type="button" className="primary-button" disabled>
                      Ticket Unavailable
                    </button>
                  )}

                  {!isCancelled && booking.canCancel && (
                    <button
                      type="button"
                      className="secondary-button cancel-ticket-button"
                      onClick={() => handleCancel(booking)}
                      disabled={isCancelling}
                    >
                      {isCancelling ? "Cancelling..." : "Cancel Ticket"}
                    </button>
                  )}
                </div>

                {/* ==========================
                      CANCELLED INFO
                      ========================== */}

                {isCancelled && (
                  <div className="booking-cancelled-info">
                    <strong>Ticket Cancelled</strong>

                    {booking.refundedAmount > 0 && (
                      <span>Refund: ₹{booking.refundedAmount}</span>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {bookings.length > 0 && filteredBookings.length === 0 && (
        <section className="empty-state">
          <div className="empty-icon">⌕</div>
          <h3>No tickets match your filters</h3>
          <p>Try another route, travel date, or ticket status.</p>
        </section>
      )}
    </main>
  );
};

export default MyBookings;
