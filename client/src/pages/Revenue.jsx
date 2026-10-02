import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

const today = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const Revenue = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [date, setDate] = useState(searchParams.get("date") || today());
  const [vehicle, setVehicle] = useState(searchParams.get("vehicle") || "");
  const [vehicles, setVehicles] = useState([]);
  const [data, setData] = useState({ summary: {}, vehicles: [], trips: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        if (user?.role === "OWNER") {
          const response = await api.get("/vehicles");
          setVehicles(response.data.vehicles || []);
        } else {
          const response = await api.get("/driver/trips");
          const map = new Map();
          (response.data.trips || []).forEach((trip) => {
            if (trip.vehicle) map.set(trip.vehicle._id || trip.vehicle.id || trip.vehicle.vehicleNumber, trip.vehicle);
          });
          setVehicles(Array.from(map.values()).map((v) => ({ _id: v._id || v.id, vehicleNumber: v.vehicleNumber, type: v.type })));
        }
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load vehicles");
      }
    };
    if (user) loadVehicles();
  }, [user]);

  useEffect(() => {
    const loadRevenue = async () => {
      try {
        setLoading(true);
        const response = await api.get("/revenue", { params: { date, vehicle: vehicle || undefined } });
        setData({ summary: response.data.summary || {}, vehicles: response.data.vehicles || [], trips: response.data.trips || [] });
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load revenue");
      } finally {
        setLoading(false);
      }
    };
    loadRevenue();
  }, [date, vehicle]);

  const selectedVehicleName = useMemo(() => vehicles.find((v) => String(v._id) === String(vehicle))?.vehicleNumber, [vehicles, vehicle]);

  return (
    <main className="page-container revenue-page">
      <div className="page-heading"><p className="eyebrow">{user?.role === "OWNER" ? "OWNER PORTAL" : "DRIVER PORTAL"}</p><h1>Revenue</h1><p>Check paid booking revenue for any date and, where available, for an individual van.</p></div>
      {error && <div className="error-message">{error}</div>}

      <section className="section-block">
        <div className="revenue-filter-bar">
          <div className="input-group"><label htmlFor="revenue-date">Date</label><input id="revenue-date" className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="input-group"><label htmlFor="revenue-vehicle">Van</label><select id="revenue-vehicle" className="form-input" value={vehicle} onChange={(e) => setVehicle(e.target.value)}><option value="">All vans</option>{vehicles.map((v) => <option key={v._id} value={v._id}>{v.vehicleNumber}{v.type ? ` · ${v.type}` : ""}</option>)}</select></div>
          {vehicle && <button className="secondary-button" type="button" onClick={() => setVehicle("")}>All Vans</button>}
        </div>

        <div className="stats-grid owner-stats">
          <div className="stat-card"><span>DATE</span><strong>{new Date(`${date}T00:00:00`).toLocaleDateString()}</strong><small>{selectedVehicleName || "All vans"}</small></div>
          <div className="stat-card"><span>TRIPS</span><strong>{loading ? "—" : data.summary.trips || 0}</strong><small>Trips operated</small></div>
          <div className="stat-card"><span>PAID BOOKINGS</span><strong>{loading ? "—" : data.summary.bookings || 0}</strong><small>Confirmed and paid</small></div>
          <div className="stat-card revenue-stat"><span>TOTAL REVENUE</span><strong>{loading ? "—" : `₹${data.summary.revenue || 0}`}</strong><small>For selected date</small></div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading-row"><div><p className="eyebrow">BREAKDOWN</p><h2>Revenue by van</h2></div></div>
        {data.vehicles.length === 0 ? <div className="empty-state compact-empty"><h3>No paid revenue</h3><p>There are no confirmed paid bookings for the selected date and van.</p></div> : <div className="revenue-vehicle-grid">{data.vehicles.map((v) => <article className="revenue-vehicle-card" key={v.vehicleId}><div><span className="trip-label">VAN</span><h3>{v.vehicleNumber}</h3><p>{v.type} · {v.bookings} paid booking{v.bookings === 1 ? "" : "s"}</p></div><strong>₹{v.revenue}</strong></article>)}</div>}
      </section>

      <section className="section-block">
        <div className="section-heading-row"><div><p className="eyebrow">TRIP BREAKDOWN</p><h2>Revenue by trip</h2></div></div>
        {data.trips.length === 0 ? <div className="empty-state compact-empty"><h3>No trips</h3><p>No trips were found for the selected filters.</p></div> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Route</th><th>Van</th><th>Departure</th><th>Paid bookings</th><th>Revenue</th></tr></thead><tbody>{data.trips.map((trip) => <tr key={trip.tripId}><td>{trip.route}</td><td>{trip.vehicleNumber}</td><td>{trip.departureTime} – {trip.arrivalTime}</td><td>{trip.bookings}</td><td><strong>₹{trip.revenue}</strong></td></tr>)}</tbody></table></div>}
      </section>
    </main>
  );
};

export default Revenue;
