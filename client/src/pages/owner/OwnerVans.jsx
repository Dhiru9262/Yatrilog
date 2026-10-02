import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import SeatMap from "../../components/SeatMap";

const today = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const OwnerVans = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [date, setDate] = useState(today());
  const [data, setData] = useState({ bookings: [], summary: {}, trips: [] });
  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get("/vehicles");
        setVehicles(response.data.vehicles || []);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load vans");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openVan = async (vehicle) => {
    setSelected(vehicle);
    setBookingsLoading(true);
    setError("");
    try {
      const response = await api.get(`/vehicles/${vehicle._id}/bookings`, { params: { date } });
      setData({ bookings: response.data.bookings || [], summary: response.data.summary || {}, trips: response.data.trips || [] });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load van bookings");
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    if (selected) openVan(selected);
    // selected is intentionally the only trigger; changing date should refresh below via the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  return (
    <main className="page-container owner-vans-page">
      <div className="page-heading">
        <p className="eyebrow">OWNER PORTAL</p>
        <h1>All Vans</h1>
        <p>Open any van to see its trips and all bookings for the selected day.</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? <div className="loading-state">Loading vans...</div> : vehicles.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🚌</div><h3>No vans found</h3><p>Your assigned vans will appear here.</p></div>
      ) : (
        <section className="section-block">
          <div className="vehicle-card-grid">
            {vehicles.map((vehicle) => (
              <button key={vehicle._id} type="button" className={`vehicle-summary-card ${selected?._id === vehicle._id ? "selected" : ""}`} onClick={() => openVan(vehicle)}>
                <div className="vehicle-summary-icon">🚌</div>
                <div className="vehicle-summary-copy">
                  <span className="trip-label">VEHICLE</span>
                  <h3>{vehicle.vehicleNumber}</h3>
                  <p>{vehicle.type} · {vehicle.totalSeats} seats</p>
                </div>
                <span className={`status-pill ${vehicle.status === "ACTIVE" ? "success" : "danger"}`}>{vehicle.status}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {selected && (
        <section className="section-block vehicle-bookings-panel">
          <div className="section-heading-row">
            <div><p className="eyebrow">VAN BOOKINGS</p><h2>{selected.vehicleNumber}</h2><p>{selected.type} · {selected.totalSeats} seats</p></div>
            <div className="booking-filter-grid single-date-filter">
              <div className="input-group"><label htmlFor="van-booking-date">Date</label><input id="van-booking-date" className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <Link to={`/owner/revenue?vehicle=${selected._id}&date=${date}`} className="secondary-button">View Revenue</Link>
            </div>
          </div>

          <section className="card owner-van-seat-layout-card">
            <div className="section-heading-row">
              <div><p className="eyebrow">CANONICAL SEAT LAYOUT</p><h3>{selected.vehicleNumber} seating arrangement</h3><p>This is the same layout configured for this van.</p></div>
            </div>
            <SeatMap
              layout={selected.seatLayout}
              seats={(selected.seatLayout?.seats || []).map((seat) => ({ seatNumber: seat.seatNumber || seat.label, status: "AVAILABLE" }))}
              readOnly
            />
          </section>

          <div className="stats-grid owner-stats">
            <div className="stat-card"><span>TRIPS</span><strong>{bookingsLoading ? "—" : data.trips.length}</strong><small>Trips for this van</small></div>
            <div className="stat-card"><span>BOOKINGS</span><strong>{bookingsLoading ? "—" : data.summary.bookings || 0}</strong><small>Booking records</small></div>
            <div className="stat-card"><span>CONFIRMED</span><strong>{bookingsLoading ? "—" : data.summary.confirmed || 0}</strong><small>Confirmed bookings</small></div>
            <div className="stat-card"><span>PAID REVENUE</span><strong>{bookingsLoading ? "—" : `₹${data.summary.revenue || 0}`}</strong><small>Confirmed paid bookings</small></div>
          </div>

          {bookingsLoading ? <div className="loading-state">Loading bookings...</div> : data.bookings.length === 0 ? (
            <div className="empty-state compact-empty"><h3>No bookings for this van</h3><p>No booking records were found for {date}.</p></div>
          ) : (
            <div className="table-scroll"><table className="data-table"><thead><tr><th>Booking</th><th>Passenger</th><th>Route</th><th>Journey</th><th>Seat</th><th>Fare</th><th>Status</th></tr></thead><tbody>
              {data.bookings.map((booking) => <tr key={booking.id}><td>{booking.bookingNumber}</td><td><strong>{booking.passenger?.name || "-"}</strong><br />{booking.passenger?.phone || "-"}</td><td>{booking.route}</td><td>{booking.boardingStop} → {booking.droppingStop}</td><td>{booking.seatNumber}</td><td>₹{booking.fare}</td><td>{booking.status}<br />{booking.paymentStatus}</td></tr>)}
            </tbody></table></div>
          )}
        </section>
      )}
    </main>
  );
};

export default OwnerVans;
