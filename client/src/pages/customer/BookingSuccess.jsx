import { Link, useLocation } from "react-router-dom";

const BookingSuccess = () => {
  const location = useLocation();

  /*
   * New backend response:
   *
   * {
   *   bookings: [
   *     {...seat 1},
   *     {...seat 2}
   *   ]
   * }
   *
   * Keep support for the old single-booking response too.
   */

  const stateBookings = location.state?.bookings;

  const singleBooking = location.state?.booking;

  const bookings =
    Array.isArray(stateBookings) && stateBookings.length > 0
      ? stateBookings
      : singleBooking
        ? [singleBooking]
        : [];

  if (bookings.length === 0) {
    return (
      <main className="page-container success-page">
        <div className="card empty-state">
          <div className="success-check">✓</div>

          <h2>Booking completed</h2>

          <p>Your booking was successful.</p>

          <Link to="/customer/bookings" className="primary-button">
            View My Bookings
          </Link>
        </div>
      </main>
    );
  }

  // ======================================
  // COMMON TRIP INFORMATION
  // ======================================

  const firstBooking = bookings[0];

  // ======================================
  // TOTAL FARE
  // ======================================

  const totalFare = bookings.reduce(
    (total, booking) => total + Number(booking.fare || 0),
    0,
  );

  // ======================================
  // SEAT NUMBERS
  // ======================================

  const seatNumbers = bookings
    .map((booking) => booking.seatNumber)
    .filter(Boolean);

  // ======================================
  // BOOKING NUMBERS
  // ======================================

  const bookingNumbers = bookings
    .map((booking) => booking.bookingNumber)
    .filter(Boolean);

  return (
    <main className="page-container success-page">
      {/* ====================================== */}
      {/* SUCCESS HEADER */}
      {/* ====================================== */}

      <div className="success-heading">
        <div className="success-check">✓</div>

        <p className="eyebrow">PAYMENT SUCCESSFUL</p>

        <h1>Booking Confirmed</h1>

        <p>
          {bookings.length === 1
            ? "Your seat has been successfully booked."
            : `${bookings.length} seats have been successfully booked.`}
        </p>
      </div>

      {/* ====================================== */}
      {/* MAIN TICKET */}
      {/* ====================================== */}

      <section className="ticket">
        {/* ================================== */}
        {/* BOOKING NUMBERS */}
        {/* ================================== */}

        <div className="ticket-top">
          <div>
            <span>
              {bookings.length === 1 ? "BOOKING NUMBER" : "BOOKING NUMBERS"}
            </span>

            <strong>{bookingNumbers.join(", ")}</strong>
          </div>

          <span className="status-badge status-confirmed">CONFIRMED</span>
        </div>

        {/* ================================== */}
        {/* ROUTE */}
        {/* ================================== */}

        <div className="ticket-route">
          <div>
            <span>BOARDING</span>

            <strong>{firstBooking.boardingStop || "-"}</strong>
          </div>

          <div className="route-line">
            <span />
            <div>→</div>
            <span />
          </div>

          <div className="ticket-destination">
            <span>DROPPING</span>

            <strong>{firstBooking.droppingStop || "-"}</strong>
          </div>
        </div>

        {/* ================================== */}
        {/* JOURNEY DETAILS */}
        {/* ================================== */}

        <div className="ticket-details">
          <div>
            <span>DATE</span>

            <strong>
              {firstBooking.date
                ? new Date(firstBooking.date).toLocaleDateString()
                : "-"}
            </strong>
          </div>

          <div>
            <span>DEPARTURE</span>

            <strong>{firstBooking.departureTime || "-"}</strong>
          </div>

          <div>
            <span>SEATS</span>

            <strong>{seatNumbers.join(", ") || "-"}</strong>
          </div>

          <div>
            <span>TOTAL FARE</span>

            <strong>₹{totalFare}</strong>
          </div>
        </div>

        {/* ================================== */}
        {/* INDIVIDUAL SEATS */}
        {/* ================================== */}

        <div className="ticket-seat-list">
          <div className="ticket-seat-list-header">
            <span>SEAT</span>

            <span>FARE</span>
          </div>

          {bookings.map((booking, index) => (
            <div
              className="ticket-seat-row"
              key={booking.id || booking._id || booking.bookingNumber || index}
            >
              <strong>Seat {booking.seatNumber}</strong>

              <strong>₹{booking.fare}</strong>
            </div>
          ))}
        </div>

        {/* ================================== */}
        {/* TOTAL */}
        {/* ================================== */}

        <div className="ticket-payment">
          <div>
            <span>
              {bookings.length} {bookings.length === 1 ? "SEAT" : "SEATS"}
            </span>

            <strong>{seatNumbers.join(", ")}</strong>
          </div>

          <div>
            <span>PAYMENT</span>

            <strong>{firstBooking.paymentStatus || "PAID"}</strong>
          </div>

          <div>
            <span>TOTAL</span>

            <strong>₹{totalFare}</strong>
          </div>
        </div>

        {/* ================================== */}
        {/* DRIVER */}
        {/* ================================== */}

        {firstBooking.driver && (
          <div className="ticket-driver">
            <div>
              <span>DRIVER</span>

              <strong>{firstBooking.driver.name || "Assigned driver"}</strong>
            </div>

            {firstBooking.driver.phone && (
              <a
                href={`tel:${firstBooking.driver.phone}`}
                className="call-driver"
              >
                📞 Call Driver
              </a>
            )}
          </div>
        )}
      </section>

      {/* ====================================== */}
      {/* ACTIONS */}
      {/* ====================================== */}

      <div className="success-actions">
        <Link to="/customer/bookings" className="primary-button">
          View My Bookings
        </Link>

        <Link to="/customer/search" className="secondary-button">
          Book Another Trip
        </Link>
      </div>
    </main>
  );
};

export default BookingSuccess;
