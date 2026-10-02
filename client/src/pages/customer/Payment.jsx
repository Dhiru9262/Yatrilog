import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import api from "../../api/axios";

const Payment = () => {
  const { tripId } = useParams();

  const location = useLocation();

  const navigate = useNavigate();

  const {
    locks,
    lock,
    trip,
    fromStop,
    toStop,
    selectedSeats,
    selectedSeat,
    totalFare,
  } = location.state || {};

  // ======================================
  // NORMALIZE LOCKS
  // ======================================

  const paymentLocks =
    Array.isArray(locks) && locks.length > 0 ? locks : lock ? [lock] : [];

  // ======================================
  // NORMALIZE SEATS
  // ======================================

  const seats =
    Array.isArray(selectedSeats) && selectedSeats.length > 0
      ? selectedSeats
      : selectedSeat
        ? [selectedSeat]
        : paymentLocks.map((item) => item.seatNumber);

  // ======================================
  // STATE
  // ======================================

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  // ======================================
  // CALCULATE DISPLAY TOTAL
  // ======================================

  const displayTotal = totalFare ?? Number(trip?.fare || 0) * seats.length;

  // ======================================
  // START PAYMENT
  // ======================================

  const handlePayment = async () => {
    try {
      setLoading(true);

      setError("");

      // ==================================
      // VALIDATE LOCKS
      // ==================================

      if (paymentLocks.length === 0) {
        setError("Seat locks are missing or expired.");

        setLoading(false);

        return;
      }

      // ==================================
      // GET LOCK IDS
      // ==================================

      const lockIds = paymentLocks
        .map((item) => item.id || item._id)
        .filter(Boolean);

      if (lockIds.length !== paymentLocks.length) {
        setError("One or more seat locks are invalid.");

        setLoading(false);

        return;
      }

      // ==================================
      // CREATE RAZORPAY ORDER
      // ==================================

      const response = await api.post("/payments/order", {
        lockIds,
      });

      const payment = response.data.payment;

      if (!payment?.razorpayOrderId) {
        throw new Error("Payment order was not created");
      }

      // ==================================
      // CHECK RAZORPAY
      // ==================================

      if (!window.Razorpay) {
        throw new Error("Razorpay Checkout is not loaded");
      }

      // ==================================
      // RAZORPAY OPTIONS
      // ==================================

      const options = {
        key: payment.razorpayKeyId,

        amount: payment.amount * 100,

        currency: payment.currency,

        name: "Public Transport System",

        description:
          seats.length === 1
            ? "Bus Ticket Booking"
            : `${seats.length} Bus Tickets`,

        order_id: payment.razorpayOrderId,

        handler: async function (razorpayResponse) {
          try {
            setLoading(true);
            setError("");

            const verifyResponse = await api.post("/payments/verify", {
              lockIds,

              razorpayPaymentId: razorpayResponse.razorpay_payment_id,

              razorpayOrderId: razorpayResponse.razorpay_order_id,

              razorpaySignature: razorpayResponse.razorpay_signature,
            });

            console.log("VERIFY RESPONSE:", verifyResponse.data);

            // ==================================
            // GET ALL BOOKINGS
            // ==================================

            const bookings = verifyResponse.data?.bookings || [];

            if (bookings.length === 0) {
              throw new Error(
                verifyResponse.data?.message ||
                  "Payment succeeded, but booking details were not returned.",
              );
            }

            // ==================================
            // GO TO SUCCESS PAGE
            // ==================================

            const firstBooking = bookings[0];

            const firstBookingId = firstBooking?.id || firstBooking?._id;

            if (!firstBookingId) {
              console.error("Invalid booking response:", bookings);

              throw new Error(
                "Booking was created, but booking ID was not returned.",
              );
            }

            navigate(`/customer/booking-success/${firstBookingId}`, {
              state: {
                bookings,
              },
            });
          } catch (error) {
            console.error("Payment verification error:", error);

            setError(
              error.response?.data?.message ||
                error.message ||
                "Payment verification failed",
            );
          } finally {
            setLoading(false);
          }
        },

        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },

        theme: {
          color: "#2563eb",
        },
      };

      // ==================================
      // OPEN RAZORPAY
      // ==================================

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", function (response) {
        console.error("Payment failed:", response.error);

        setError(response.error?.description || "Payment failed");

        setLoading(false);
      });

      razorpay.open();
    } catch (error) {
      console.error("Payment error:", error);

      setError(
        error.response?.data?.message ||
          error.message ||
          "Unable to start payment",
      );

      setLoading(false);
    }
  };

  // ======================================
  // MISSING INFORMATION
  // ======================================

  if (paymentLocks.length === 0 || !trip) {
    return (
      <main className="page-container">
        <section className="empty-state">
          <div className="empty-icon">💳</div>

          <h2>Payment information unavailable</h2>

          <p>Please select your seats again.</p>

          <button
            className="primary-button"
            onClick={() => navigate("/customer/search")}
          >
            Back to Search
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="page-container payment-page">
      <div className="page-heading">
        <p className="eyebrow">SECURE CHECKOUT</p>

        <h1>Confirm & Pay</h1>

        <p>Review your journey and complete your payment.</p>
      </div>

      {/* ==================================
          TRIP
          ================================== */}

      <section className="payment-card card">
        <div className="payment-trip-header">
          <div>
            <span className="trip-label">JOURNEY</span>

            <h2>{trip.route?.name || "Bus Journey"}</h2>
          </div>

          <span className="payment-secure">🔒 Secure</span>
        </div>

        <div className="payment-route">
          <div>
            <span>FROM</span>

            <strong>{trip.boardingStop?.name || fromStop}</strong>
          </div>

          <span>→</span>

          <div>
            <span>TO</span>

            <strong>{trip.droppingStop?.name || toStop}</strong>
          </div>
        </div>

        {/* ==================================
            TRIP INFO
            ================================== */}

        <div className="payment-info-grid">
          <div>
            <span>DATE</span>

            <strong>{new Date(trip.date).toLocaleDateString()}</strong>
          </div>

          <div>
            <span>DEPARTURE</span>

            <strong>{trip.departureTime}</strong>
          </div>

          <div>
            <span>ARRIVAL</span>

            <strong>{trip.arrivalTime || "-"}</strong>
          </div>
        </div>

        {/* ==================================
            SELECTED SEATS
            ================================== */}

        <div className="payment-seats">
          <div className="payment-section-title">Selected Seats</div>

          <div className="payment-seat-list">
            {seats.map((seatNumber) => (
              <span key={seatNumber} className="payment-seat">
                Seat {seatNumber}
              </span>
            ))}
          </div>
        </div>

        {/* ==================================
            FARE
            ================================== */}

        <div className="payment-summary">
          <div>
            <span>Fare per seat</span>

            <strong>₹{trip.fare}</strong>
          </div>

          <div>
            <span>Seats</span>

            <strong>{seats.length}</strong>
          </div>

          <div className="payment-total">
            <span>Total</span>

            <strong>₹{displayTotal}</strong>
          </div>
        </div>

        {/* ==================================
            LOCK
            ================================== */}

        <div className="payment-lock-info">
          <span>🔒 Seats temporarily reserved</span>

          {paymentLocks[0]?.expiresAt && (
            <strong>
              Expires at{" "}
              {new Date(paymentLocks[0].expiresAt).toLocaleTimeString()}
            </strong>
          )}
        </div>

        {/* ==================================
            ERROR
            ================================== */}

        {error && <div className="error-message">{error}</div>}

        {/* ==================================
            PAY
            ================================== */}

        <button
          type="button"
          className="primary-button payment-button"
          onClick={handlePayment}
          disabled={loading}
        >
          {loading ? "Processing..." : `Pay ₹${displayTotal}`}
        </button>
      </section>
    </main>
  );
};

export default Payment;
