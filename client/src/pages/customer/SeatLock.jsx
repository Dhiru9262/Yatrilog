import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import api from "../../api/axios";

const SeatLock = () => {
  const { tripId } = useParams();

  const location = useLocation();

  const navigate = useNavigate();

  const {
    fromStop,
    toStop,
    selectedSeat,
    selectedSeats,
    trip,
    date,
    totalFare,
  } = location.state || {};

  // ======================================
  // NORMALIZE SELECTED SEATS
  // ======================================

  const seatsToLock =
    Array.isArray(selectedSeats) && selectedSeats.length > 0
      ? selectedSeats
      : selectedSeat
        ? [selectedSeat]
        : [];

  // ======================================
  // STATE
  // ======================================

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [locks, setLocks] = useState([]);

  const [expiresAt, setExpiresAt] = useState(null);

  // ======================================
  // CREATE MULTIPLE LOCKS
  // ======================================

  useEffect(() => {
    let cancelled = false;

    const createLocks = async () => {
      try {
        setLoading(true);

        setError("");

        if (!fromStop || !toStop || seatsToLock.length === 0) {
          setError("Seat selection information is missing.");

          return;
        }

        // ==================================
        // CREATE LOCKS
        // ==================================

        const response = await api.post("/seat-locks", {
          tripId,

          boardingStop: fromStop,

          droppingStop: toStop,

          seatNumbers: seatsToLock,
        });

        if (cancelled) {
          return;
        }

        const createdLocks = response.data.locks || [];

        setLocks(createdLocks);

        /*
         * All locks are created with the
         * same expiration time.
         */

        if (createdLocks.length > 0) {
          setExpiresAt(createdLocks[0].expiresAt);
        }
      } catch (error) {
        console.error("Create seat locks error:", error);

        if (cancelled) {
          return;
        }

        setError(
          error.response?.data?.message ||
            "Unable to reserve the selected seats.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    createLocks();

    return () => {
      cancelled = true;
    };
  }, [tripId, fromStop, toStop, selectedSeat, selectedSeats]);

  // ======================================
  // CONTINUE TO PAYMENT
  // ======================================

  const handlePayment = () => {
    if (locks.length === 0) {
      setError("No active seat locks found.");

      return;
    }

    navigate(`/customer/payment/${tripId}`, {
      state: {
        locks,

        // Backward compatibility
        lock: locks[0],

        trip,

        fromStop,

        toStop,

        selectedSeats: seatsToLock,

        selectedSeat: seatsToLock[0],

        date,

        totalFare: totalFare ?? Number(trip?.fare || 0) * seatsToLock.length,
      },
    });
  };

  // ======================================
  // LOADING
  // ======================================

  if (loading) {
    return (
      <main className="page-container">
        <div className="loading-state">Reserving your seats...</div>
      </main>
    );
  }

  // ======================================
  // ERROR
  // ======================================

  if (error) {
    return (
      <main className="page-container">
        <section className="empty-state">
          <div className="empty-icon">⚠️</div>

          <h2>Unable to reserve seats</h2>

          <p>{error}</p>

          <button
            type="button"
            className="primary-button"
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
        </section>
      </main>
    );
  }

  // ======================================
  // NO LOCKS
  // ======================================

  if (locks.length === 0) {
    return (
      <main className="page-container">
        <section className="empty-state">
          <div className="empty-icon">🔒</div>

          <h2>No seats reserved</h2>

          <button
            type="button"
            className="primary-button"
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
        </section>
      </main>
    );
  }

  // ======================================
  // SUCCESS
  // ======================================

  return (
    <main className="page-container seat-lock-page">
      <section className="seat-lock-card card">
        <div className="seat-lock-success-icon">✓</div>

        <p className="eyebrow">SEATS RESERVED</p>

        <h1>Your seats are reserved</h1>

        <p className="seat-lock-description">
          These seats are temporarily reserved while you complete your payment.
        </p>

        {/* ==================================
            JOURNEY
            ================================== */}

        <div className="seat-lock-journey">
          <div>
            <span>FROM</span>

            <strong>{trip?.boardingStop?.name || fromStop}</strong>
          </div>

          <span>→</span>

          <div>
            <span>TO</span>

            <strong>{trip?.droppingStop?.name || toStop}</strong>
          </div>
        </div>

        {/* ==================================
            SELECTED SEATS
            ================================== */}

        <div className="seat-lock-seats">
          <span>
            {seatsToLock.length === 1 ? "Selected Seat" : "Selected Seats"}
          </span>

          <div className="seat-lock-seat-list">
            {seatsToLock.map((seatNumber) => (
              <span key={seatNumber} className="seat-lock-seat">
                {seatNumber}
              </span>
            ))}
          </div>
        </div>

        {/* ==================================
            TOTAL
            ================================== */}

        <div className="seat-lock-total">
          <span>Total Fare</span>

          <strong>
            ₹{totalFare ?? Number(trip?.fare || 0) * seatsToLock.length}
          </strong>
        </div>

        {/* ==================================
            EXPIRY
            ================================== */}

        {expiresAt && (
          <div className="seat-lock-expiry">
            <span>Complete payment before</span>

            <strong>{new Date(expiresAt).toLocaleTimeString()}</strong>
          </div>
        )}

        {/* ==================================
            PAYMENT
            ================================== */}

        <button
          type="button"
          className="primary-button seat-lock-payment-button"
          onClick={handlePayment}
        >
          Continue to Payment →
        </button>
      </section>
    </main>
  );
};

export default SeatLock;
