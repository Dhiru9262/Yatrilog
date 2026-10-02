import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import api from "../../api/axios";

const AdminVehicles = () => {
  const [vehicles, setVehicles] = useState([]);

  const [owners, setOwners] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [editingVehicle, setEditingVehicle] = useState(null);

  const [form, setForm] = useState({
    vehicleNumber: "",
    type: "AC",
    totalSeats: "",
    seatLayout: "2x2",
    owner: "",
  });

  // ==========================================
  // LOAD VEHICLES
  // ==========================================

  const loadVehicles = async () => {
    try {
      const response = await api.get("/vehicles");

      setVehicles(response.data.vehicles || []);
    } catch (error) {
      console.error("Load vehicles error:", error);

      setError(error.response?.data?.message || "Unable to load vehicles");
    }
  };

  // ==========================================
  // LOAD OWNERS
  // ==========================================

  const loadOwners = async () => {
    try {
      /*
       * We need an endpoint that returns
       * users with role OWNER.
       *
       * We'll verify this endpoint with
       * your backend before using it.
       */

      const response = await api.get("/users?role=OWNER");

      setOwners(response.data.users || []);
    } catch (error) {
      console.error("Load owners error:", error);

      /*
       * Don't block the vehicle page.
       *
       * If owner endpoint doesn't exist,
       * we'll add it next.
       */

      setOwners([]);
    }
  };

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        await Promise.all([loadVehicles(), loadOwners()]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // ==========================================
  // INPUT CHANGE
  // ==========================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // ==========================================
  // RESET FORM
  // ==========================================

  const resetForm = () => {
    setForm({
      vehicleNumber: "",
      type: "AC",
      totalSeats: "",
      seatLayout: "2x2",
      owner: "",
    });

    setEditingVehicle(null);
    setShowForm(false);
  };

  // ==========================================
  // EDIT VEHICLE
  // ==========================================

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);

    setForm({
      vehicleNumber: vehicle.vehicleNumber || "",

      type: vehicle.type || "AC",

      totalSeats: vehicle.totalSeats || "",

      seatLayout: vehicle.seatLayout || "2x2",

      owner: vehicle.owner?._id || vehicle.owner || "",
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ==========================================
  // SAVE VEHICLE
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!form.vehicleNumber.trim()) {
      setError("Vehicle number is required");

      return;
    }

    if (!form.totalSeats) {
      setError("Total seats are required");

      return;
    }

    if (!form.owner) {
      setError("Please select an owner");

      return;
    }

    try {
      setSaving(true);

      const payload = {
        vehicleNumber: form.vehicleNumber.trim().toUpperCase(),

        type: form.type,

        totalSeats: Number(form.totalSeats),

        seatLayout: form.seatLayout,

        owner: form.owner,
      };

      if (editingVehicle) {
        await api.put(`/vehicles/${editingVehicle._id}`, payload);
      } else {
        await api.post("/vehicles", payload);
      }

      await loadVehicles();

      resetForm();
    } catch (error) {
      console.error("Save vehicle error:", error);

      setError(error.response?.data?.message || "Unable to save vehicle");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // CHANGE STATUS
  // ==========================================

  const handleStatusChange = async (vehicle) => {
    const newStatus = vehicle.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";

    try {
      await api.patch(`/vehicles/${vehicle._id}/status`, {
        status: newStatus,
      });

      await loadVehicles();
    } catch (error) {
      console.error("Vehicle status error:", error);

      setError(
        error.response?.data?.message || "Unable to update vehicle status",
      );
    }
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <main className="page-container">
        <div className="loading-state">Loading vehicles...</div>
      </main>
    );
  }

  return (
    <main className="page-container admin-vehicles-page">
      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <div className="admin-page-header">
        <div>
          <Link to="/admin" className="back-button">
            ← Admin Dashboard
          </Link>

          <p className="eyebrow">OPERATIONS</p>

          <h1>Vehicles</h1>

          <p>Manage buses and their seating configuration.</p>
        </div>

        <button
          className="primary-button"
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
        >
          {showForm ? "Close" : "+ Add Vehicle"}
        </button>
      </div>

      {/* ================================= */}
      {/* ERROR */}
      {/* ================================= */}

      {error && <div className="error-message">{error}</div>}

      {/* ================================= */}
      {/* FORM */}
      {/* ================================= */}

      {showForm && (
        <section className="card vehicle-form-card">
          <div className="section-title">
            <p className="eyebrow">
              {editingVehicle ? "EDIT VEHICLE" : "NEW VEHICLE"}
            </p>

            <h2>{editingVehicle ? "Update vehicle" : "Add a vehicle"}</h2>
          </div>

          <form onSubmit={handleSubmit} className="vehicle-form">
            {/* VEHICLE NUMBER */}

            <div className="input-group">
              <label>Vehicle Number</label>

              <input
                name="vehicleNumber"
                type="text"
                placeholder="UP14AB1234"
                value={form.vehicleNumber}
                onChange={handleChange}
              />
            </div>

            {/* TYPE */}

            <div className="input-group">
              <label>Vehicle Type</label>

              <select name="type" value={form.type} onChange={handleChange}>
                <option value="AC">AC Bus</option>

                <option value="NON_AC">Non-AC Bus</option>

                <option value="VOLVO">Volvo</option>

                <option value="ELECTRIC">Electric Bus</option>
              </select>
            </div>

            {/* TOTAL SEATS */}

            <div className="input-group">
              <label>Total Seats</label>

              <input
                name="totalSeats"
                type="number"
                min="1"
                placeholder="40"
                value={form.totalSeats}
                onChange={handleChange}
              />
            </div>

            {/* SEAT LAYOUT */}

            <div className="input-group">
              <label>Seat Layout</label>

              <select
                name="seatLayout"
                value={form.seatLayout}
                onChange={handleChange}
              >
                <option value="2x2">2 × 2</option>

                <option value="2x1">2 × 1</option>

                <option value="3x2">3 × 2</option>
              </select>
            </div>

            {/* OWNER */}

            <div className="input-group">
              <label>Owner</label>

              {owners.length > 0 ? (
                <select name="owner" value={form.owner} onChange={handleChange}>
                  <option value="">Select owner</option>

                  {owners.map((owner) => (
                    <option key={owner._id} value={owner._id}>
                      {owner.name}
                      {" — "}
                      {owner.email}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="field-warning">
                  No owners available. We need to create/ fetch an OWNER account
                  first.
                </div>
              )}
            </div>

            {/* ACTIONS */}

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={resetForm}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={saving || owners.length === 0}
              >
                {saving
                  ? "Saving..."
                  : editingVehicle
                    ? "Update Vehicle"
                    : "Create Vehicle"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ================================= */}
      {/* VEHICLE LIST */}
      {/* ================================= */}

      <section className="vehicle-section">
        <div className="section-title">
          <p className="eyebrow">FLEET</p>

          <h2>All Vehicles</h2>
        </div>

        {vehicles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🚌</div>

            <h3>No vehicles yet</h3>

            <p>Add your first vehicle to start managing your fleet.</p>
          </div>
        ) : (
          <div className="vehicle-list">
            {vehicles.map((vehicle) => (
              <article className="vehicle-card" key={vehicle._id}>
                <div className="vehicle-icon">🚌</div>

                <div className="vehicle-main">
                  <div className="vehicle-title-row">
                    <h3>{vehicle.vehicleNumber}</h3>

                    <span
                      className={
                        vehicle.status === "ACTIVE"
                          ? "status-badge status-confirmed"
                          : "status-badge status-cancelled"
                      }
                    >
                      {vehicle.status}
                    </span>
                  </div>

                  <p>
                    {vehicle.type}
                    {" · "}
                    {vehicle.totalSeats}
                    {" seats · "}
                    {vehicle.seatLayout?.seats?.length ? "Custom layout saved" : "Layout not designed yet"}
                  </p>

                  <small>Owner: {vehicle.owner?.name || "Unknown"}</small>
                </div>

                <div className="vehicle-actions">
                  <button
                    className="secondary-button"
                    onClick={() => handleEdit(vehicle)}
                  >
                    Edit
                  </button>

                  <Link to={`/admin/seat-layout?vehicle=${vehicle._id}`} className="secondary-button">Design Seats</Link>

                  <button
                    className="vehicle-status-button"
                    onClick={() => handleStatusChange(vehicle)}
                  >
                    {vehicle.status === "ACTIVE" ? "Block" : "Activate"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default AdminVehicles;
