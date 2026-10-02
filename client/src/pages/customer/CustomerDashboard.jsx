import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

const CustomerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ======================================
  // SEARCH STATE
  // ======================================

  const [stops, setStops] = useState([]);

  const [fromStop, setFromStop] = useState("");
  const [toStop, setToStop] = useState("");
  const [date, setDate] = useState("");

  const [trips, setTrips] = useState([]);

  const [loadingStops, setLoadingStops] = useState(true);
  const [loadingTrips, setLoadingTrips] = useState(false);

  const [hasSearched, setHasSearched] = useState(false);

  const [error, setError] = useState("");

  const firstName = user?.name?.split(" ")[0] || "there";

  // ======================================
  // GOING TODAY
  // ======================================

  const today = new Date().toISOString().split("T")[0];

  // ======================================
  // LOAD AVAILABLE SGOING TOPS
  // ======================================

  useEffect(() => {
    const loadStops = async () => {
      try {
        setLoadingStops(true);
        setError("");

        const response = await api.get("/routes/stops");

        setStops(response.data.stops || []);
      } catch (error) {
        console.error("Load dashboard stops error:", error);

        setError(error.response?.data?.message || "Unable to load stops");
      } finally {
        setLoadingStops(false);
      }
    };

    loadStops();
  }, []);

  // ======================================
  // SEARCH TRIPS
  // ======================================

  const handleSearch = async (event) => {
    event.preventDefault();

    setError("");
    setHasSearched(false);
    setTrips([]);

    // -------------------------------
    // VALIDATION
    // -------------------------------

    if (!fromStop || !toStop || !date) {
      setError(
        "Please select your boarding stop, dropping stop and travel date.",
      );

      return;
    }

    if (fromStop === toStop) {
      setError("Boarding and dropping stops cannot be the same.");

      return;
    }

    try {
      setLoadingTrips(true);

      // -------------------------------
      // SEARCH API
      // -------------------------------

      const response = await api.get("/customer/trips/search", {
        params: {
          fromStop,
          toStop,
          date,
        },
      });

      const searchResults = response.data.trips || [];

      setTrips(searchResults);

      setHasSearched(true);
    } catch (error) {
      console.error("Dashboard trip search error:", error);

      setError(error.response?.data?.message || "Unable to search trips");
    } finally {
      setLoadingTrips(false);
    }
  };

  // ======================================
  // SWAP BOARDING FROM / GOING TO
  // ======================================

  const handleSwapStops = () => {
    setFromStop(toStop);
    setToStop(fromStop);

    /*
     * If the customer already searched,
     * clear old results because the route
     * has changed.
     */

    if (hasSearched) {
      setTrips([]);
      setHasSearched(false);
    }

    setError("");
  };

  // ======================================
  // VIEW SEATS
  // ======================================

  const handleViewTrip = (trip) => {
    if (!trip?.tripId || !trip?.boardingStop?.id || !trip?.droppingStop?.id) {
      setError("Unable to open this trip. Trip information is incomplete.");

      return;
    }

    navigate(`/customer/trips/${trip.tripId}`, {
      state: {
        fromStop: trip.boardingStop.id,

        toStop: trip.droppingStop.id,

        date,
      },
    });
  };

  return (
    <main className="page-container customer-home">
      {/* ======================================
          HERO
          ====================================== */}

      <section className="customer-hero">
        <div className="customer-hero-content">
          <p className="eyebrow">BOOK YOUR BUS</p>

          <h1>
            Where do you want to
            <br />
            go, {firstName}?
          </h1>

          <p className="customer-hero-text">
            Choose your stops and travel date below.
          </p>
        </div>

        <div className="customer-hero-decoration">
          <span>✦</span>
          <span>✦</span>
        </div>
      </section>

      {/* ======================================
          SEARCH CARD
          ====================================== */}

      <section className="customer-search-card">
        <div className="customer-search-header">
          <div>
            <p className="search-card-label">PLAN A TRIP</p>

            <h2>Where are you going?</h2>
          </div>

          <span className="search-card-icon">🚌</span>
        </div>

        {/* ==================================
            ERROR
            ================================== */}

        {error && <div className="error-message">{error}</div>}

        {/* ==================================
            SEARCH FORM
            ================================== */}

        <form
          onSubmit={handleSearch}
          className="customer-dashboard-search-form"
        >
          {/* ==================================
              BOARDING FROM
              ================================== */}

          <div className="dashboard-search-field">
            <label htmlFor="dashboard-from">BOARDING FROM</label>

            <div className="dashboard-input-wrapper">
              <span className="dashboard-input-icon">↑</span>

              <select
                id="dashboard-from"
                value={fromStop}
                onChange={(event) => {
                  setFromStop(event.target.value);

                  if (hasSearched) {
                    setTrips([]);
                    setHasSearched(false);
                  }

                  setError("");
                }}
                disabled={loadingStops}
              >
                <option value="">
                  {loadingStops ? "Loading stops..." : "Leaving from"}
                </option>

                {stops.map((stop) => (
                  <option key={stop._id} value={stop.name}>
                    {stop.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ==================================
              SWAP
              ================================== */}

          <button
            type="button"
            className="dashboard-swap-button"
            onClick={handleSwapStops}
            disabled={!fromStop && !toStop}
            aria-label="Swap boarding and dropping stops"
          >
            ⇄
          </button>

          {/* ==================================
              GOING TO
              ================================== */}

          <div className="dashboard-search-field">
            <label htmlFor="dashboard-to">GOING TO</label>

            <div className="dashboard-input-wrapper">
              <span className="dashboard-input-icon">↓</span>

              <select
                id="dashboard-to"
                value={toStop}
                onChange={(event) => {
                  setToStop(event.target.value);

                  if (hasSearched) {
                    setTrips([]);
                    setHasSearched(false);
                  }

                  setError("");
                }}
                disabled={loadingStops}
              >
                <option value="">
                  {loadingStops ? "Loading stops..." : "Going to"}
                </option>

                {stops.map((stop) => (
                  <option key={stop._id} value={stop.name}>
                    {stop.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ==================================
              DATE
              ================================== */}

          <div className="dashboard-search-field">
            <label htmlFor="dashboard-date">TRAVEL DATE</label>

            <div className="dashboard-input-wrapper">
              <span className="dashboard-input-icon">◷</span>

              <input
                id="dashboard-date"
                type="date"
                min={today}
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);

                  if (hasSearched) {
                    setTrips([]);
                    setHasSearched(false);
                  }

                  setError("");
                }}
              />
            </div>
          </div>

          {/* ==================================
              SEARCH BUTGOING TON
              ================================== */}

          <button
            type="submit"
            className="primary-button customer-search-button"
            disabled={loadingStops || loadingTrips}
          >
            {loadingTrips ? "Searching..." : "Find buses"}

            {!loadingTrips && <span>→</span>}
          </button>
        </form>
      </section>

      {/* ======================================
          SEARCH RESULTS
          ====================================== */}

      {loadingTrips && (
        <div className="loading-state customer-search-loading">
          Searching available trips...
        </div>
      )}

      {/* ======================================
          RESULTS FOUND
          ====================================== */}

      {!loadingTrips && trips.length > 0 && (
        <section className="customer-results-section">
          {/* RESULTS HEADER */}

          <div className="customer-results-heading">
            <div>
              <p className="eyebrow">AVAILABLE TRIPS</p>

              <h2>
                {trips.length} {trips.length === 1 ? "trip" : "trips"} found
              </h2>
            </div>

            <span className="customer-results-route">
              {fromStop} → {toStop}
            </span>
          </div>

          {/* TRIP LIST */}

          <div className="customer-trip-results">
            {trips.map((trip) => (
              <article className="customer-trip-card" key={trip.tripId}>
                {/* ==========================
                      ROUTE + TIME
                      ========================== */}

                <div className="customer-trip-main">
                  <div>
                    <span className="trip-label">ROUTE</span>

                    <h3>{trip.route?.name || "Bus Trip"}</h3>
                  </div>

                  <div className="customer-trip-time">
                    <strong>{trip.departureTime || "-"}</strong>

                    <span>→</span>

                    <strong>{trip.arrivalTime || "-"}</strong>
                  </div>
                </div>

                {/* ==========================
                      TRIP INFORMATION
                      ========================== */}

                <div className="customer-trip-info">
                  <span>
                    📍 {trip.boardingStop?.name || fromStop}
                    {" → "}
                    {trip.droppingStop?.name || toStop}
                  </span>

                  <span>🚌 {trip.vehicle?.type || "-"}</span>

                  <span>🚍 {trip.vehicle?.vehicleNumber || "-"}</span>
                </div>

                {/* ==========================
                      FARE + VIEW SEATS
                      ========================== */}

                <div className="customer-trip-bottom">
                  <div>
                    <span className="fare-label">Fare</span>

                    <strong className="fare">₹{trip.fare}</strong>
                  </div>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => handleViewTrip(trip)}
                  >
                    View Seats →
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ======================================
          NO RESULTS
          ====================================== */}

      {!loadingTrips && hasSearched && trips.length === 0 && !error && (
        <div className="empty-state customer-no-results">
          <div className="empty-icon">🚌</div>

          <h3>No trips found</h3>

          <p>
            No buses are available for
            {` ${fromStop} → ${toStop}`}
            on the selected date.
          </p>

          <p>Try another date or route.</p>
        </div>
      )}

      {/* ======================================
          QUICK ACTIONS
          ====================================== */}

      <section className="customer-section">
        <div className="customer-section-heading">
          <div>
            <p className="eyebrow">QUICK ACCESS</p>

            <h2>Manage your journey</h2>
          </div>
        </div>

        <div className="customer-action-grid">
          {/* SEARCH TRIPS */}

          <Link to="/customer/search" className="customer-action-card">
            <div className="customer-action-icon">🔎</div>

            <div>
              <h3>Search Trips</h3>

              <p>Find buses, routes, and available seats.</p>
            </div>

            <span className="customer-action-arrow">→</span>
          </Link>

          {/* MY BOOKINGS */}

          <Link to="/customer/bookings" className="customer-action-card">
            <div className="customer-action-icon">🎫</div>

            <div>
              <h3>My Bookings</h3>

              <p>View tickets, booking details, and trip information.</p>
            </div>

            <span className="customer-action-arrow">→</span>
          </Link>
        </div>
      </section>

      {/* ======================================
          TRAVEL TIP
          ====================================== */}

      <section className="customer-tip-card">
        <div className="customer-tip-icon">✦</div>

        <div>
          <p className="customer-tip-label">TRAVEL TIP</p>

          <h3>Book early for a better seat.</h3>

          <p>
            Your selected seat is temporarily locked while you complete payment.
          </p>
        </div>
      </section>
    </main>
  );
};

export default CustomerDashboard;
