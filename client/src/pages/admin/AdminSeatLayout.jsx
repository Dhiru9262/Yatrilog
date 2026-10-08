import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../api/axios";

const makeDefaultLayout = (count) => {
  // Use more columns for large vans so 40+ seats never collapse into
  // overlapping rows. The canvas height grows with the number of rows.
  const columns = count <= 16 ? 4 : count <= 30 ? 5 : count <= 48 ? 6 : 7;
  const rows = Math.ceil(count / columns);
  const canvasHeight = Math.max(600, 150 + rows * 62);
  const left = 0.16;
  const right = 0.84;
  const positions = Array.from({ length: columns }, (_, i) =>
    columns === 1 ? 0.5 : left + (i * (right - left)) / (columns - 1),
  );
  return {
    version: 2,
    seatCount: count,
    canvas: { width: 760, height: canvasHeight },
    seats: Array.from({ length: count }, (_, i) => ({
      id: `seat-${i + 1}`,
      seatNumber: String(i + 1),
      label: String(i + 1),
      x: positions[i % columns],
      y: rows === 1 ? 0.5 : 0.20 + Math.floor(i / columns) * (0.60 / (rows - 1)),
    })),
  };
};

const normalize = (layout, count) => {
  if (layout?.seats?.length) return { ...layout, seatCount: Number(layout.seatCount || count) };
  return makeDefaultLayout(count);
};

const AdminSeatLayout = () => {
  const canvasRef = useRef(null);
  const [searchParams] = useSearchParams();
  const requestedVehicleId = searchParams.get("vehicle");
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState(requestedVehicleId || "");
  const [seatCount, setSeatCount] = useState(16);
  const [layout, setLayout] = useState(makeDefaultLayout(16));
  const [drag, setDrag] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => String(vehicle._id) === String(vehicleId)),
    [vehicles, vehicleId],
  );

  const loadVehicles = async () => {
    const response = await api.get("/vehicles");
    const items = response.data.vehicles || [];
    setVehicles(items);
    if (items.length) {
      const requested = items.find((item) => String(item._id) === String(requestedVehicleId));
      if (requested) setVehicleId(requested._id);
      else if (!vehicleId) setVehicleId(items[0]._id);
    }
  };

  const loadVehicle = async (id) => {
    if (!id) return;
    const response = await api.get(`/vehicles/${id}`);
    const vehicle = response.data.vehicle;
    const count = Number(vehicle.totalSeats || 16);
    setSeatCount(count);
    setLayout(normalize(vehicle.seatLayout, count));
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await loadVehicles();
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load vehicles");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    if (!vehicleId) return;
    loadVehicle(vehicleId).catch((err) => setError(err.response?.data?.message || "Unable to load vehicle layout"));
  }, [vehicleId]);

  const updateSeatCount = (value) => {
    const count = Math.max(1, Math.min(80, Number(value) || 1));
    setSeatCount(count);
    setLayout((current) => {
      const next = makeDefaultLayout(count);
      current.seats.slice(0, count).forEach((seat, index) => {
        if (next.seats[index]) next.seats[index] = { ...next.seats[index], ...seat };
      });
      return { ...next, seatCount: count };
    });
  };

  const moveSeat = (event) => {
    if (!drag || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const seatSize = 64;
    const x = Math.max(0.05, Math.min(0.95, (event.clientX - rect.left - drag.offsetX) / rect.width));
    const y = Math.max(0.14, Math.min(0.93, (event.clientY - rect.top - drag.offsetY) / rect.height));
    setLayout((current) => ({
      ...current,
      seats: current.seats.map((seat) => seat.id === drag.id ? { ...seat, x, y } : seat),
    }));
    void seatSize;
  };

  const startDrag = (event, seat) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDrag({ id: seat.id, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top });
  };

  const save = async () => {
    if (!selectedVehicle) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const response = await api.put(`/vehicles/${selectedVehicle._id}/seat-layout`, {
        seatLayout: { ...layout, seatCount },
      });
      setLayout(response.data.seatLayout);
      setMessage("Layout saved. This exact layout is now the canonical layout for this van and will be used by every role.");
      await loadVehicles();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save seat layout");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="page-container"><div className="loading-state">Loading seat designer...</div></main>;

  return (
    <main className="page-container admin-seat-layout-page">
      <Link to="/admin" className="back-button">← Admin Dashboard</Link>
      <div className="designer-heading">
        <div>
          <p className="eyebrow">VEHICLE CONFIGURATION</p>
          <h1>Seat Layout Designer</h1>
          <p>Design the actual van once. Every role will see this exact saved arrangement.</p>
        </div>
        <div className="designer-badge">CANONICAL VAN LAYOUT</div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      <section className="seat-designer-card">
        <div className="designer-toolbar">
          <label>
            <span>Van</span>
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              {vehicles.map((vehicle) => <option key={vehicle._id} value={vehicle._id}>{vehicle.vehicleNumber} · {vehicle.type}</option>)}
            </select>
          </label>
          <label>
            <span>Number of seats</span>
            <input type="number" min="1" max="80" value={seatCount} onChange={(e) => updateSeatCount(e.target.value)} />
          </label>
          <div className="designer-actions">
            <button type="button" className="secondary-button" onClick={() => setLayout(makeDefaultLayout(seatCount))}>Reset Layout</button>
            <button type="button" className="primary-button" disabled={!selectedVehicle || saving} onClick={save}>{saving ? "Saving..." : "Save Layout"}</button>
          </div>
        </div>

        <div className="designer-instructions">
          <strong>Drag any seat anywhere inside the van.</strong>
          <span>Use the full canvas to create your real seating arrangement, including aisles and irregular rows.</span>
        </div>

        <div
          ref={canvasRef}
          className="van-designer-canvas"
          style={{
            aspectRatio: `760 / ${layout.canvas?.height || 600}`,
            "--seat-columns": layout.columns || (seatCount <= 16 ? 4 : seatCount <= 30 ? 5 : seatCount <= 48 ? 6 : 7),
          }}
          onPointerMove={moveSeat}
          onPointerUp={() => setDrag(null)}
          onPointerCancel={() => setDrag(null)}
          onPointerLeave={() => setDrag(null)}
        >
          <div className="van-driver-zone"><span>FRONT</span><strong>◉ DRIVER</strong></div>
          <div className="van-windshield" />
          <div className="van-aisle-hint">AISLE</div>
          {layout.seats.slice(0, seatCount).map((seat) => (
            <button
              key={seat.id}
              type="button"
              className="designer-seat"
              style={{ left: `${seat.x * 100}%`, top: `${seat.y * 100}%` }}
              onPointerDown={(event) => startDrag(event, seat)}
              title={`Drag seat ${seat.label}`}
            >
              <span className="designer-seat-back" />
              <strong>{seat.label}</strong>
              <small>DRAG</small>
            </button>
          ))}
        </div>

        <div className="designer-footer">
          <span>{seatCount} seats</span>
          <span>Van: {selectedVehicle?.vehicleNumber || "—"}</span>
          <span>Saved layout is shared across customer, owner, driver and admin views.</span>
        </div>
      </section>
    </main>
  );
};

export default AdminSeatLayout;
