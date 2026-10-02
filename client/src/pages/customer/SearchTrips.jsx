import { useEffect, useMemo, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import api from "../../api/axios";

const SearchTrips = () => {
  const navigate = useNavigate();

  const location = useLocation();

  const dashboardSearch = location.state || {};

  const [stops, setStops] = useState([]);

  const [fromStop, setFromStop] = useState(dashboardSearch.fromStop || "");

  const [toStop, setToStop] = useState(dashboardSearch.toStop || "");

  const [date, setDate] = useState(dashboardSearch.date || "");

  const [trips, setTrips] = useState(
    dashboardSearch.searched ? dashboardSearch.trips || [] : [],
  );

  const [loadingStops, setLoadingStops] = useState(true);

  const [loadingTrips, setLoadingTrips] = useState(false);

  const [error, setError] = useState("");

  // Result controls: users can narrow and reorder buses without searching again.
  const [vehicleFilter, setVehicleFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("departure");
  const [sortDirection, setSortDirection] = useState("asc");

  // ======================================
  // LOAD STOPS
  // ======================================

  useEffect(() => {
    const loadStops = async () => {
      try {
        setLoadingStops(true);

        setError("");

        const response = await api.get("/routes/stops");

        setStops(response.data.stops || []);
      } catch (error) {
        console.error("Load stops error:", error);

        setError(error.response?.data?.message || "Unable to load stops");
      } finally {
        setLoadingStops(false);
      }
    };

    loadStops();
  }, []);

  // ======================================
  // SEARCH
  // ======================================

  const handleSearch = async (event) => {
    event.preventDefault();

    setError("");
    setTrips([]);
    setVehicleFilter("ALL");
    setSortBy("departure");
    setSortDirection("asc");

    if (!fromStop || !toStop || !date) {
      setError("Please select From, To and Date");

      return;
    }

    if (fromStop === toStop) {
      setError("From and To stops cannot be the same");

      return;
    }

    try {
      setLoadingTrips(true);

      const response = await api.get("/customer/trips/search", {
        params: {
          fromStop,
          toStop,
          date,
        },
      });

      const results = response.data.trips || [];

      setTrips(results);

      navigate("/customer/search", {
        replace: true,
        state: {
          fromStop,
          toStop,
          date,
          trips: results,
          searched: true,
        },
      });
    } catch (error) {
      console.error("Search trips error:", error);

      setError(error.response?.data?.message || "Unable to search trips");
    } finally {
      setLoadingTrips(false);
    }
  };

  // ======================================
  // SWAP
  // ======================================

  const vehicleOptions = useMemo(() => {
    const seen = new Map();

    trips.forEach((trip) => {
      const id = trip.vehicle?.id || trip.vehicle?.vehicleNumber;
      if (id && !seen.has(String(id))) {
        seen.set(String(id), trip.vehicle?.vehicleNumber || trip.vehicle?.type || "Van");
      }
    });

    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [trips]);

  const displayedTrips = useMemo(() => {
    const filtered = trips.filter((trip) => {
      if (vehicleFilter === "ALL") return true;
      return String(trip.vehicle?.id || trip.vehicle?.vehicleNumber) === vehicleFilter;
    });

    const toMinutes = (value) => {
      if (!value || typeof value !== "string") return Number.MAX_SAFE_INTEGER;
      const match = value.match(/(\d{1,2}):(\d{2})/);
      if (!match) return Number.MAX_SAFE_INTEGER;
      return Number(match[1]) * 60 + Number(match[2]);
    };

    const sorted = [...filtered].sort((a, b) => {
      let aValue;
      let bValue;

      if (sortBy === "fare") {
        aValue = Number(a.fare ?? Number.MAX_SAFE_INTEGER);
        bValue = Number(b.fare ?? Number.MAX_SAFE_INTEGER);
      } else if (sortBy === "vehicle") {
        aValue = String(a.vehicle?.vehicleNumber || a.vehicle?.type || "").toLowerCase();
        bValue = String(b.vehicle?.vehicleNumber || b.vehicle?.type || "").toLowerCase();
      } else {
        aValue = toMinutes(a.departureTime);
        bValue = toMinutes(b.departureTime);
      }

      if (typeof aValue === "string") return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  }, [trips, vehicleFilter, sortBy, sortDirection]);

  const handleSortChange = (value) => {
    if (value === sortBy) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(value);
    setSortDirection("asc");
  };

  const handleSwapStops = () => {
    setFromStop(toStop);
    setToStop(fromStop);
  };

  // ======================================
  // VIEW TRIP
  // ======================================

  const handleViewTrip = (trip) => {
    const from = trip.boardingStop?.id;

    const to = trip.droppingStop?.id;

    if (!trip?.tripId || !from || !to) {
      setError("Unable to open this trip. Trip information is incomplete.");

      return;
    }

    navigate(
      `/customer/trips/${trip.tripId}?from=${encodeURIComponent(
        from,
      )}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}`,
      {
        state: {
          fromStop: from,
          toStop: to,
          date,
        },
      },
    );
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <main className="page-container search-page">
      {/* HEADER */}

      <div className="page-heading search-page-heading">
        <p className="eyebrow">PLAN YOUR JOURNEY</p>

        <h1>Find your next trip</h1>

        <p>Choose your route and travel date to see available buses.</p>
      </div>

      {/* SEARCH */}

      <section className="search-card card">
        <form onSubmit={handleSearch} className="search-form">
          <div className="input-group">
            <label htmlFor="from-stop">From</label>

            <select
              id="from-stop"
              value={fromStop}
              onChange={(event) => setFromStop(event.target.value)}
              disabled={loadingStops}
            >
              <option value="">
                {loadingStops ? "Loading stops..." : "Select boarding stop"}
              </option>

              {stops.map((stop) => (
                <option key={stop._id} value={stop.name}>
                  {stop.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="route-arrow-button"
            onClick={handleSwapStops}
            disabled={!fromStop && !toStop}
          >
            ⇄
          </button>

          <div className="input-group">
            <label htmlFor="to-stop">To</label>

            <select
              id="to-stop"
              value={toStop}
              onChange={(event) => setToStop(event.target.value)}
              disabled={loadingStops}
            >
              <option value="">
                {loadingStops ? "Loading stops..." : "Select dropping stop"}
              </option>

              {stops.map((stop) => (
                <option key={stop._id} value={stop.name}>
                  {stop.name}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="travel-date">Travel Date</label>

            <input
              id="travel-date"
              type="date"
              value={date}
              min={today}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>

          <button
            type="submit"
            className="primary-button search-button"
            disabled={loadingTrips}
          >
            {loadingTrips ? "Searching..." : "Search Trips"}
          </button>
        </form>
      </section>

      {/* ERROR */}

      {error && <div className="error-message search-message">{error}</div>}

      {/* LOADING */}

      {loadingTrips && (
        <div className="loading-state">Searching available trips...</div>
      )}

      {/* EMPTY */}

      {!loadingTrips &&
        trips.length === 0 &&
        date &&
        dashboardSearch.searched && (
          <div className="empty-state">
            <div className="empty-icon">🚌</div>

            <h3>No trips found</h3>

            <p>Try another date or route.</p>
          </div>
        )}

      {/* RESULTS */}

      {!loadingTrips && trips.length > 0 && (
        <section className="trip-results">
          <div className="results-heading">
            <div>
              <p className="eyebrow">AVAILABLE TRIPS</p>

              <h2>
                {displayedTrips.length} {displayedTrips.length === 1 ? "trip" : "trips"} shown
              </h2>
              <p className="search-results-summary">
                {trips.length} {trips.length === 1 ? "bus is" : "buses are"} scheduled for this journey.
              </p>
            </div>
          </div>

          <div className="trip-results-toolbar" aria-label="Filter and sort buses">
            <div className="trip-results-control">
              <label htmlFor="vehicle-filter">Filter by van</label>
              <select id="vehicle-filter" value={vehicleFilter} onChange={(event) => setVehicleFilter(event.target.value)}>
                <option value="ALL">All vans ({trips.length})</option>
                {vehicleOptions.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>{vehicle.label}</option>
                ))}
              </select>
            </div>

            <div className="trip-results-control">
              <label htmlFor="trip-sort">Sort trips</label>
              <select id="trip-sort" value={sortBy} onChange={(event) => handleSortChange(event.target.value)}>
                <option value="departure">Departure time {sortBy === "departure" ? (sortDirection === "asc" ? "↑" : "↓") : ""}</option>
                <option value="fare">Fare {sortBy === "fare" ? (sortDirection === "asc" ? "↑" : "↓") : ""}</option>
                <option value="vehicle">Van number {sortBy === "vehicle" ? (sortDirection === "asc" ? "↑" : "↓") : ""}</option>
              </select>
            </div>

            {(vehicleFilter !== "ALL" || sortBy !== "departure" || sortDirection !== "asc") && (
              <button type="button" className="secondary-button trip-results-clear" onClick={() => {
                setVehicleFilter("ALL");
                setSortBy("departure");
                setSortDirection("asc");
              }}>
                Clear
              </button>
            )}
          </div>

          {displayedTrips.length === 0 ? (
            <div className="empty-state trip-filter-empty">
              <div className="empty-icon">🔎</div>
              <h3>No vans match this filter</h3>
              <p>Try another van or clear the filters.</p>
            </div>
          ) : displayedTrips.map((trip) => (
            <article className="trip-card" key={trip.tripId}>
              <div className="trip-main">
                <div>
                  <span className="trip-label">ROUTE</span>

                  <h2>{trip.route?.name}</h2>
                </div>

                <div className="trip-time">
                  <strong>{trip.departureTime}</strong>

                  <span>→</span>

                  <strong>{trip.arrivalTime}</strong>
                </div>
              </div>

              <div className="trip-info">
                <span>
                  📍 {trip.boardingStop?.name}
                  {" → "}
                  {trip.droppingStop?.name}
                </span>

                <span>🚌 {trip.vehicle?.type}</span>

                <span>🚍 {trip.vehicle?.vehicleNumber}</span>
              </div>

              {/* STOP-SPECIFIC TIME */}

              <div className="trip-segment-time">
                <span>YOUR JOURNEY</span>

                <strong>
                  {trip.boardingStop?.name} {trip.departureTime}
                  {" → "}
                  {trip.droppingStop?.name} {trip.arrivalTime}
                </strong>
              </div>

              <div className="trip-bottom">
                <div>
                  <span className="fare-label">Fare</span>

                  <strong className="fare">₹{trip.fare}</strong>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => handleViewTrip(trip)}
                >
                  View Seats
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
};

export default SearchTrips;
