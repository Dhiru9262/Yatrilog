import { useCallback, useEffect, useState } from "react";

import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import SeatMap from "../../components/SeatMap";

import socket from "../../socket";

import api from "../../api/axios";

const TripDetails = () => {
  const { tripId } = useParams();

  const location = useLocation();

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  // ======================================
  // JOURNEY
  // ======================================

  const fromStop = location.state?.fromStop || searchParams.get("from");

  const toStop = location.state?.toStop || searchParams.get("to");

  const searchedDate = location.state?.date || searchParams.get("date");

  // ======================================
  // STATE
  // ======================================

  const [trip, setTrip] = useState(null);

  const [seats, setSeats] = useState([]);

  const [selectedSeats, setSelectedSeats] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshingSeats, setRefreshingSeats] = useState(false);

  const [error, setError] = useState("");

  // ======================================
  // LOAD SEATS
  // ======================================

  const loadSeats = useCallback(
    async (showLoading = false) => {
      if (!tripId || !fromStop || !toStop) {
        return;
      }

      try {
        if (showLoading) {
          setRefreshingSeats(true);
        }

        const response = await api.get(`/trips/${tripId}/seats`, {
          params: {
            fromStop,
            toStop,
          },
        });

        const availableSeats = response.data.seats || [];

        setSeats(availableSeats);

        setSelectedSeats((currentSeats) =>
          currentSeats.filter((selectedSeat) => {
            const seat = availableSeats.find(
              (item) => item.seatNumber === selectedSeat,
            );

            return seat && seat.status === "AVAILABLE";
          }),
        );
      } catch (error) {
        console.error("Seat refresh error:", error);

        if (showLoading) {
          setError(
            error.response?.data?.message || "Unable to load seat availability",
          );
        }
      } finally {
        if (showLoading) {
          setRefreshingSeats(false);
        }
      }
    },
    [tripId, fromStop, toStop],
  );

  // ======================================
  // LOAD TRIP
  // ======================================

  useEffect(() => {
    const loadTripDetails = async () => {
      try {
        setLoading(true);
        setError("");

        if (!fromStop || !toStop) {
          setError("Journey information is missing. Please search again.");

          return;
        }

        const tripResponse = await api.get(`/customer/trips/${tripId}`, {
          params: {
            fromStop,
            toStop,
          },
        });

        setTrip(tripResponse.data.trip);

        await loadSeats(true);
      } catch (error) {
        console.error("Load trip details error:", error);

        setError(
          error.response?.data?.message || "Unable to load trip details",
        );
      } finally {
        setLoading(false);
      }
    };

    loadTripDetails();
  }, [tripId, fromStop, toStop, loadSeats]);

  // ======================================
  // SOCKET
  // ======================================

  useEffect(() => {
    if (!tripId) {
      return;
    }

    socket.connect();

    socket.emit("joinTrip", tripId);

    const handleSeatUpdate = (data) => {
      if (String(data.tripId) !== String(tripId)) {
        return;
      }

      loadSeats(false);
    };

    socket.on("seat:update", handleSeatUpdate);

    return () => {
      socket.emit("leaveTrip", tripId);

      socket.off("seat:update", handleSeatUpdate);

      socket.disconnect();
    };
  }, [tripId, loadSeats]);

  // ======================================
  // SELECT / DESELECT
  // ======================================

  const handleSeatSelect = (seat) => {
    if (!seat || seat.status !== "AVAILABLE") {
      return;
    }

    setError("");

    setSelectedSeats((currentSeats) => {
      const alreadySelected = currentSeats.includes(seat.seatNumber);

      if (alreadySelected) {
        return currentSeats.filter(
          (seatNumber) => seatNumber !== seat.seatNumber,
        );
      }

      return [...currentSeats, seat.seatNumber];
    });
  };

  // ======================================
  // FARE
  // ======================================

  const farePerSeat = Number(trip?.fare) || 0;

  const totalFare = farePerSeat * selectedSeats.length;

  // ======================================
  // CONTINUE
  // ======================================

  const handleContinue = () => {
    setError("");

    if (selectedSeats.length === 0) {
      setError("Please select at least one seat.");

      return;
    }

    const unavailableSeat = selectedSeats.find((selectedSeat) => {
      const seat = seats.find((item) => item.seatNumber === selectedSeat);

      return !seat || seat.status !== "AVAILABLE";
    });

    if (unavailableSeat) {
      setSelectedSeats((currentSeats) =>
        currentSeats.filter((seatNumber) => {
          const seat = seats.find((item) => item.seatNumber === seatNumber);

          return seat && seat.status === "AVAILABLE";
        }),
      );

      setError(
        `Seat ${unavailableSeat} is no longer available. Please select again.`,
      );

      return;
    }

    navigate(`/customer/trips/${tripId}/lock`, {
      state: {
        fromStop,
        toStop,

        selectedSeats,

        // Backward compatibility
        selectedSeat: selectedSeats[0],

        trip,

        date: searchedDate,

        totalFare,
      },
    });
  };

  // ======================================
  // BACK
  // ======================================

  const handleBackToSearch = () => {
    navigate("/customer/search", {
      state: {
        fromStop,
        toStop,
        date: searchedDate,
        searched: false,
      },
    });
  };

  // ======================================
  // LOADING
  // ======================================

  if (loading) {
    return (
      <main className="page-container">
        <div className="loading-state">Loading trip details...</div>
      </main>
    );
  }

  // ======================================
  // ERROR
  // ======================================

  if (error && !trip) {
    return (
      <main className="page-container">
        <div className="error-message">{error}</div>

        <button
          type="button"
          className="primary-button"
          onClick={handleBackToSearch}
        >
          ← Back to Search
        </button>
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="page-container">
        <div className="empty-state">
          <div className="empty-icon">🚌</div>

          <h3>Trip not found</h3>

          <p>This trip may no longer be available.</p>

          <button
            type="button"
            className="primary-button"
            onClick={handleBackToSearch}
          >
            ← Back to Search
          </button>
        </div>
      </main>
    );
  }

  // ======================================
  // STOP SCHEDULE
  // ======================================

  const stopSchedule = Array.isArray(trip.stopSchedule)
    ? trip.stopSchedule
    : [];

  return (
    <main className="page-container trip-details-page">
      {/* BACK */}

      <button
        type="button"
        className="back-button"
        onClick={handleBackToSearch}
      >
        ← Back to search
      </button>

      {/* TRIP HEADER */}

      <section className="trip-header card">
        <div>
          <span className="trip-label">YOUR JOURNEY</span>

          <h1>{trip.route?.name}</h1>

          <div className="journey-route">
            <strong>{trip.boardingStop?.name}</strong>

            <span>→</span>

            <strong>{trip.droppingStop?.name}</strong>
          </div>

          {/* CUSTOMER JOURNEY TIME */}

          <div className="journey-time-display">
            <span>YOUR JOURNEY TIME</span>

            <strong>
              {trip.departureTime}
              {" → "}
              {trip.arrivalTime}
            </strong>
          </div>
        </div>

        <div className="trip-price">
          <span>Fare / Seat</span>

          <strong>₹{trip.fare}</strong>
        </div>
      </section>

      {/* ================================= */}
      {/* COMPLETE STOP SCHEDULE */}
      {/* ================================= */}

      {stopSchedule.length > 0 && (
        <section className="trip-schedule-section card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ROUTE SCHEDULE</p>

              <h2>Stop timings</h2>
            </div>
          </div>

          <div className="trip-stop-timeline">
            {stopSchedule.map((stop, index) => {
              const isBoarding =
                String(stop.stopId) === String(trip.boardingStop?.id);

              const isDropping =
                String(stop.stopId) === String(trip.droppingStop?.id);

              return (
                <div
                  className={`trip-stop-item ${
                    isBoarding || isDropping ? "selected-journey-stop" : ""
                  }`}
                  key={stop.stopId || index}
                >
                  <div className="trip-stop-marker">
                    <span>{index + 1}</span>
                  </div>

                  <div className="trip-stop-content">
                    <div>
                      <strong>{stop.name}</strong>

                      {(isBoarding || isDropping) && (
                        <span className="trip-stop-badge">
                          {isBoarding ? "BOARDING" : "DROPPING"}
                        </span>
                      )}
                    </div>

                    <div className="trip-stop-times">
                      <span>
                        <small>ARRIVAL</small>

                        <strong>{stop.arrivalTime || "--"}</strong>
                      </span>

                      <span>
                        <small>DEPARTURE</small>

                        <strong>{stop.departureTime || "--"}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TRIP INFO */}

      <section className="trip-info-card card">
        <div>
          <span>Date</span>

          <strong>{new Date(trip.date).toLocaleDateString()}</strong>
        </div>

        <div>
          <span>Departure</span>

          <strong>{trip.departureTime}</strong>
        </div>

        <div>
          <span>Arrival</span>

          <strong>{trip.arrivalTime}</strong>
        </div>

        <div>
          <span>Vehicle</span>

          <strong>{trip.vehicle?.type}</strong>
        </div>

        <div>
          <span>Vehicle Number</span>

          <strong>{trip.vehicle?.vehicleNumber}</strong>
        </div>
      </section>

      {/* ERROR */}

      {error && <div className="error-message">{error}</div>}

      {/* SEATS */}

      <section className="seat-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CHOOSE YOUR SEAT</p>

            <h2>Select comfortable seats</h2>

            <p>You can select multiple seats.</p>
          </div>

          {selectedSeats.length > 0 && (
            <div className="selected-seat-info">
              <span>Selected seats</span>

              <strong>{selectedSeats.join(", ")}</strong>
            </div>
          )}
        </div>

        <SeatMap
          seats={seats}
          layout={trip.vehicle?.seatLayout}
          selectedSeats={selectedSeats}
          onSeatSelect={handleSeatSelect}
        />

        {refreshingSeats && (
          <p className="loading-state">Updating seat availability...</p>
        )}
      </section>

      {/* BOTTOM ACTION */}

      <div className="booking-action-bar">
        <div>
          <span>
            {selectedSeats.length}{" "}
            {selectedSeats.length === 1 ? "Seat" : "Seats"}
          </span>

          <strong>₹{totalFare}</strong>
        </div>

        <button
          type="button"
          className="primary-button"
          disabled={selectedSeats.length === 0}
          onClick={handleContinue}
        >
          {selectedSeats.length > 0
            ? `Continue with ${selectedSeats.length} ${
                selectedSeats.length === 1 ? "Seat" : "Seats"
              }`
            : "Select a Seat"}
        </button>
      </div>
    </main>
  );
};

export default TripDetails;
