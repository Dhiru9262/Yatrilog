import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

const todayString = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
};

const DailyBookings = () => {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";
  const isAdmin = user?.role === "ADMIN";
  const [date, setDate] = useState(todayString());
  const [routeFilter, setRouteFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");

  const [data, setData] = useState({ summary: {}, bookings: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/daily-bookings", { params: { date, route: routeFilter || undefined, vehicle: vehicleFilter || undefined } });
        setData({
          summary: response.data.summary || {},
          bookings: response.data.bookings || [],
        });
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load daily bookings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [date, routeFilter, vehicleFilter]);

  const routeOptions = useMemo(() => {
    const map = new Map();
    data.bookings.forEach((booking) => {
      if (booking.trip?.routeId && booking.trip?.route) {
        map.set(String(booking.trip.routeId), booking.trip.route);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [data.bookings]);

  const vehicleOptions = useMemo(() => {
    const map = new Map();
    data.bookings.forEach((booking) => {
      if (booking.trip?.vehicleId && booking.trip?.vehicleNumber) {
        map.set(String(booking.trip.vehicleId), booking.trip.vehicleNumber);
      }
    });
    return Array.from(map.entries()).map(([id, number]) => ({ id, number }));
  }, [data.bookings]);

  const grouped = useMemo(() => {
    const groups = new Map();
    data.bookings.forEach((booking) => {
      const key = booking.trip?.id || "unknown";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(booking);
    });
    return Array.from(groups.values());
  }, [data.bookings]);

  return (
    <main className="page-container trips-page">
      <div className="page-heading">
        <p className="eyebrow">{isAdmin ? "ADMIN PORTAL" : isOwner ? "OWNER PORTAL" : "DRIVER PORTAL"}</p>
        <h1>Daily Bookings</h1>
        <p>See every booking, passenger, seat, journey, payment and booking source for the selected day.</p>
      </div>

      <section className="section-block">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">BOOKING DATE</p>
            <h2>{new Date(`${date}T00:00:00`).toLocaleDateString()}</h2>
          </div>
          <div className="booking-filter-grid">
            <div className="input-group">
              <label htmlFor="booking-date-filter">Date</label>
              <input
                id="booking-date-filter"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="form-input"
              />
            </div>
            <div className="input-group">
              <label htmlFor="booking-route-filter">Route</label>
              <select
                id="booking-route-filter"
                value={routeFilter}
                onChange={(event) => setRouteFilter(event.target.value)}
                className="form-input"
              >
                <option value="">All routes</option>
                {routeOptions.map((route) => (
                  <option key={route.id} value={route.id}>{route.name}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="booking-vehicle-filter">Bus</label>
              <select
                id="booking-vehicle-filter"
                value={vehicleFilter}
                onChange={(event) => setVehicleFilter(event.target.value)}
                className="form-input"
              >
                <option value="">All buses</option>
                {vehicleOptions.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>{vehicle.number}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="secondary-button booking-filter-clear"
              onClick={() => { setDate(todayString()); setRouteFilter(""); setVehicleFilter(""); }}
            >
              Clear Filters
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="stats-grid owner-stats">
          <div className="stat-card"><span>TRIPS</span><strong>{loading ? "—" : data.summary.trips || 0}</strong><small>Trips on this date</small></div>
          <div className="stat-card"><span>BOOKINGS</span><strong>{loading ? "—" : data.summary.bookings || 0}</strong><small>All booking records</small></div>
          <div className="stat-card"><span>CONFIRMED</span><strong>{loading ? "—" : data.summary.confirmed || 0}</strong><small>Confirmed seats</small></div>
          <div className="stat-card"><span>PAID REVENUE</span><strong>{loading ? "—" : `₹${data.summary.revenue || 0}`}</strong><small>Confirmed paid bookings</small></div>
        </div>
      </section>

      {loading ? (
        <div className="loading-state">Loading bookings...</div>
      ) : grouped.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">▣</div>
          <h3>No bookings for this day</h3>
          <p>Bookings will appear here when a trip has booking records.</p>
        </div>
      ) : (
        <div className="section-block">
          {grouped.map((bookings) => {
            const trip = bookings[0].trip;
            return (
              <article className="owner-trip-card" key={trip?.id} style={{ marginBottom: 18 }}>
                <div className="owner-trip-header">
                  <div>
                    <span className="trip-label">TRIP</span>
                    <h2>{trip?.route || "Unknown route"}</h2>
                  </div>
                  <span className="trip-status">{bookings.length} booking{bookings.length === 1 ? "" : "s"}</span>
                </div>

                <div className="owner-trip-details">
                  <div><span>DEPARTURE</span><strong>{trip?.departureTime || "-"}</strong></div>
                  <div><span>ARRIVAL</span><strong>{trip?.arrivalTime || "-"}</strong></div>
                  <div><span>VEHICLE</span><strong>{trip?.vehicleNumber || "-"}</strong></div>
                  <div><span>DRIVER</span><strong>{trip?.driver || "-"}</strong></div>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th align="left">Booking</th>
                        <th align="left">Passenger</th>
                        <th align="left">Journey</th>
                        <th align="left">Seat</th>
                        <th align="left">Fare</th>
                        <th align="left">Payment</th>
                        <th align="left">Source</th>
                        <th align="left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking) => (
                        <tr key={booking.id}>
                          <td>{booking.bookingNumber}</td>
                          <td>
                            <strong>{booking.passenger?.name || "-"}</strong>
                            <br />{booking.passenger?.phone || "-"}
                          </td>
                          <td>{booking.boardingStop || "-"} → {booking.droppingStop || "-"}</td>
                          <td>{booking.seatNumber}</td>
                          <td>₹{booking.fare}</td>
                          <td>{booking.paymentMethod}<br />{booking.paymentStatus}</td>
                          <td>{booking.bookingType}{booking.bookedBy?.role ? ` · ${booking.bookedBy.role}` : ""}</td>
                          <td>{booking.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
};

export default DailyBookings;
