import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import api from "../../api/axios";

const BookingDetails = () => {
  const { bookingId } = useParams();

  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [cancellingId, setCancellingId] = useState(null);

  // ======================================
  // LOAD BOOKING
  // ======================================

  const loadBooking = async () => {
    try {
      setLoading(true);
      setError("");

      if (!bookingId || bookingId === "undefined") {
        setError("Invalid booking ID.");

        return;
      }

      const response = await api.get(`/customer/bookings/${bookingId}`);

      setBooking(response.data?.booking || null);
    } catch (error) {
      console.error("Load booking details error:", error);

      setError(
        error.response?.data?.message || "Unable to load booking details",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  // ======================================
  // CANCEL ONE SEAT
  // ======================================

  const handleCancelSeat = async (seat) => {
    const targetBookingId = seat?.bookingId;

    if (!targetBookingId) {
      setError("Booking ID for this seat is missing.");

      return;
    }

    const confirmed = window.confirm(
      `Cancel Seat ${seat.seatNumber}?\n\n` +
        `A full refund of ₹${seat.fare} will be processed if the cancellation is made more than 1 hour before departure.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancellingId(targetBookingId);
      setError("");

      const response = await api.post(
        `/customer/bookings/${targetBookingId}/cancel`,
      );

      alert(
        `Seat ${seat.seatNumber} cancelled successfully.\nRefund: ₹${
          response.data?.refund?.amount || seat.fare
        }`,
      );

      await loadBooking();
    } catch (error) {
      console.error("Cancel seat error:", error);

      setError(error.response?.data?.message || "Unable to cancel seat");
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
        <div className="loading-state">Loading ticket...</div>
      </main>
    );
  }

  // ======================================
  // ERROR
  // ======================================

  if (error && !booking) {
    return (
      <main className="page-container">
        <section className="empty-state">
          <div className="empty-icon">🎫</div>

          <h2>Unable to load ticket</h2>

          <p>{error}</p>

          <button
            type="button"
            className="primary-button"
            onClick={() => navigate("/customer/bookings")}
          >
            Back to My Bookings
          </button>
        </section>
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="page-container">
        <section className="empty-state">
          <div className="empty-icon">🎫</div>

          <h2>Booking not found</h2>

          <p>This booking could not be found.</p>

          <Link to="/customer/bookings" className="primary-button">
            Back to My Bookings
          </Link>
        </section>
      </main>
    );
  }

  // ======================================
  // NORMALIZE SEATS
  // ======================================

  const seats =
    Array.isArray(booking.seats) && booking.seats.length > 0
      ? booking.seats
      : [
          {
            seatNumber: booking.seatNumber,

            fare: booking.fare,

            bookingId: booking.id,

            bookingNumber: booking.bookingNumber,

            status: booking.status,

            refundedAmount: booking.refundedAmount || 0,
          },
        ];

  // ======================================
  // TOTAL
  // ======================================

  const totalFare =
    booking.totalFare ??
    seats.reduce((total, seat) => total + Number(seat.fare || 0), 0);

  const activeFare = seats
    .filter((seat) => seat.status !== "CANCELLED")
    .reduce((total, seat) => total + Number(seat.fare || 0), 0);

  const seatNumbers = seats.map((seat) => seat.seatNumber).filter(Boolean);

  return (
    <main className="page-container booking-details-page">
      {/* BACK */}

      <button
        type="button"
        className="back-button"
        onClick={() => navigate("/customer/bookings")}
      >
        ← Back to bookings
      </button>

      {/* HEADER */}

      <div className="page-heading">
        <p className="eyebrow">YOUR TICKET</p>

        <h1>Booking Details</h1>

        <p>Your journey and ticket information.</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* TICKET */}

      <section className="ticket">
        {/* BOOKING HEADER */}

        <div className="ticket-top">
          <div>
            <span>BOOKING NUMBER</span>

            <strong>{booking.bookingNumber || "-"}</strong>
          </div>

          <span
            className={`status-badge ${
              booking.status === "CANCELLED"
                ? "status-cancelled"
                : "status-confirmed"
            }`}
          >
            {booking.status || "CONFIRMED"}
          </span>
        </div>

        {/* ROUTE */}

        <div className="ticket-route">
          <div>
            <span>BOARDING</span>

            <strong>{booking.boardingStop || "-"}</strong>
          </div>

          <div className="route-line">
            <span />

            <div>→</div>

            <span />
          </div>

          <div className="ticket-destination">
            <span>DROPPING</span>

            <strong>{booking.droppingStop || "-"}</strong>
          </div>
        </div>

        {/* TRIP DETAILS */}

        <div className="ticket-details">
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
            <span>ARRIVAL</span>

            <strong>{booking.trip?.arrivalTime || "-"}</strong>
          </div>
        </div>

        <div className="ticket-divider">
          <span />
          <span />
        </div>

        {/* SEATS */}

        <div className="ticket-section">
          <div className="ticket-section-heading">
            <div>
              <span>SELECTED SEATS</span>

              <strong>
                {seats.length} {seats.length === 1 ? "Seat" : "Seats"}
              </strong>
            </div>

            <strong>{seatNumbers.join(", ")}</strong>
          </div>

          <div className="ticket-seat-list">
            <div className="ticket-seat-list-header">
              <span>SEAT</span>

              <span>FARE</span>
            </div>

            {seats.map((seat, index) => {
              const isCancelled = seat.status === "CANCELLED";

              const isCancelling = cancellingId === seat.bookingId;

              return (
                <div
                  className="ticket-seat-row"
                  key={
                    seat.bookingId || seat._id || `${seat.seatNumber}-${index}`
                  }
                >
                  <div>
                    <strong>Seat {seat.seatNumber}</strong>

                    {seat.bookingNumber && <small>{seat.bookingNumber}</small>}

                    {isCancelled && <small>CANCELLED</small>}
                  </div>

                  <div>
                    <strong>₹{Number(seat.fare || 0)}</strong>

                    {!isCancelled &&
                      booking.status !== "CANCELLED" &&
                      booking.paymentStatus === "PAID" && (
                        <button
                          type="button"
                          className="cancel-seat-button"
                          disabled={isCancelling}
                          onClick={() => handleCancelSeat(seat)}
                        >
                          {isCancelling ? "Cancelling..." : "Cancel"}
                        </button>
                      )}

                    {isCancelled && (
                      <small>
                        Refunded ₹
                        {Number(seat.refundedAmount || seat.fare || 0)}
                      </small>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PAYMENT */}

        <div className="ticket-payment">
          <div>
            <span>TOTAL SEATS</span>

            <strong>{seats.length}</strong>
          </div>

          <div>
            <span>ACTIVE FARE</span>

            <strong>₹{activeFare}</strong>
          </div>

          <div>
            <span>REFUNDED</span>

            <strong>
              ₹
              {Number(
                booking.refundedAmount ||
                  seats.reduce(
                    (total, seat) => total + Number(seat.refundedAmount || 0),
                    0,
                  ),
              )}
            </strong>
          </div>

          <div>
            <span>PAYMENT STATUS</span>

            <strong>{booking.paymentStatus || "PAID"}</strong>
          </div>

          <div>
            <span>ORIGINAL TOTAL</span>

            <strong>₹{totalFare}</strong>
          </div>
        </div>

        {/* DRIVER */}

        {booking.driver && (
          <>
            <div className="ticket-divider">
              <span />
              <span />
            </div>

            <div className="ticket-driver">
              <div>
                <span>DRIVER</span>

                <strong>{booking.driver.name || "Assigned driver"}</strong>
              </div>

              {booking.driver.phone && (
                <a href={`tel:${booking.driver.phone}`} className="call-driver">
                  📞 Call Driver
                </a>
              )}
            </div>
          </>
        )}

        {/* VEHICLE */}

        {booking.vehicle && (
          <div className="ticket-vehicle">
            <div>
              <span>VEHICLE</span>

              <strong>{booking.vehicle.vehicleNumber || "-"}</strong>
            </div>

            <div>
              <span>TYPE</span>

              <strong>{booking.vehicle.type || "-"}</strong>
            </div>
          </div>
        )}

        {/* POLICY */}

        <div className="cancellation-policy">
          <strong>Cancellation Policy</strong>

          <p>
            Full refund is available when cancellation is made more than 1 hour
            before departure. Cancellation within 1 hour of departure is not
            allowed.
          </p>
        </div>
      </section>

      {/* ACTIONS */}

      <div className="success-actions">
        <Link to="/customer/bookings" className="secondary-button">
          My Bookings
        </Link>

        <Link to="/customer/search" className="primary-button">
          Book Another Trip
        </Link>
      </div>
    </main>
  );
};

export default BookingDetails;
