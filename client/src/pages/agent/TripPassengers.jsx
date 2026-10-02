import { useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import api from "../../api/axios";
import SeatMap from "../../components/SeatMap";

const TripPassengers = () => {
  const { tripId } = useParams();

  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);

  const [passengers, setPassengers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [cancellingBooking, setCancellingBooking] = useState(null);
  useEffect(() => {
    const loadPassengers = async () => {
      try {
        const response = await api.get(`/driver/trips/${tripId}/passengers`);

        setTrip(response.data.trip);

        setPassengers(response.data.passengers || []);
      } catch (error) {
        console.error(error);

        setError(error.response?.data?.message || "Unable to load passengers");
      } finally {
        setLoading(false);
      }
    };

    loadPassengers();
  }, [tripId]);

  if (loading) {
    return <div>Loading passengers...</div>;
  }

  if (error) {
    return (
      <div>
        <p>{error}</p>

        <button onClick={() => navigate("/agent/trips")}>
          Back to My Trips
        </button>
      </div>
    );
  }

  const handleCancelBooking = async (booking) => {
    const confirmed = window.confirm(
      `Cancel booking ${booking.bookingNumber} for seat ${booking.seatNumber}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancellingBooking(booking.bookingNumber);

      setError("");

      await api.delete(`/driver/bookings/${booking.id}`);

      // Remove the cancelled ticket from UI.
      setPassengers((current) =>
        current.filter((item) => item.bookingNumber !== booking.bookingNumber),
      );

      alert(`Booking ${booking.bookingNumber} cancelled successfully.`);
    } catch (error) {
      console.error("Cancel booking error:", error);

      setError(error.response?.data?.message || "Unable to cancel booking");
    } finally {
      setCancellingBooking(null);
    }
  };

  return (
    <main className="page-container passengers-page">
      <button className="back-button" onClick={() => navigate("/agent/trips")}>
        ← Back to my trips
      </button>

      {trip && (
        <section className="passenger-trip-header card">
          <div>
            <p className="eyebrow">PASSENGER MANIFEST</p>

            <h1>{trip.route.name}</h1>

            <p>
              {new Date(trip.date).toLocaleDateString()}
              {" · "}
              {trip.departureTime}
            </p>
          </div>

          <div className="passenger-count">
            <strong>{passengers.length}</strong>

            <span>Passengers</span>
          </div>
        </section>
      )}

      {error && <div className="error-message">{error}</div>}

      {trip?.vehicle?.seatLayout?.seats?.length > 0 && (
        <section className="card driver-seat-layout-section">
          <div className="page-heading">
            <p className="eyebrow">VEHICLE SEAT MAP</p>
            <h2>Saved Seat Layout</h2>
            <p>This is the exact layout configured for this van by the administrator/owner.</p>
          </div>
          <SeatMap
            layout={trip.vehicle.seatLayout}
            seats={passengers.map((booking) => ({
              seatNumber: String(booking.seatNumber),
              status: "BOOKED",
            }))}
            readOnly
          />
        </section>
      )}

      {passengers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>

          <h3>No confirmed passengers</h3>

          <p>Passengers will appear here after successful booking.</p>
        </div>
      ) : (
        <section className="passenger-list">
          {passengers.map((booking) => (
            <article className="passenger-card" key={booking.bookingNumber}>
              {/* SEAT */}

              <div className="passenger-seat">
                <span>SEAT</span>

                <strong>{booking.seatNumber}</strong>
              </div>

              {/* PASSENGER */}

              <div className="passenger-main">
                <h3>{booking.passenger.name}</h3>

                <p>Booking: {booking.bookingNumber}</p>

                <p>
                  {booking.boardingStop}
                  {" → "}
                  {booking.droppingStop}
                </p>
              </div>

              {/* CONTACT */}

              <div className="passenger-contact">
                <a
                  href={`tel:${booking.passenger.phone}`}
                  className="passenger-phone"
                >
                  📞 {booking.passenger.phone}
                </a>

                <a
                  href={`mailto:${booking.passenger.email}`}
                  className="passenger-email"
                >
                  {booking.passenger.email}
                </a>
              </div>

              {/* CANCEL */}

              {booking.bookingType === "OFFLINE" && (
                <div className="passenger-actions">
                  <button
                    type="button"
                    className="danger-button"
                    disabled={cancellingBooking === booking.bookingNumber}
                    onClick={() => handleCancelBooking(booking)}
                  >
                    {cancellingBooking === booking.bookingNumber
                      ? "Cancelling..."
                      : "Cancel Ticket"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
};

export default TripPassengers;
