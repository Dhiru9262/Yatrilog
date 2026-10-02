import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import api from "../../api/axios";

const AdminDrivers = () => {
  const [drivers, setDrivers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [editingDriver, setEditingDriver] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  // ==========================================
  // LOAD DRIVERS
  // ==========================================

  const loadDrivers = async () => {
    try {
      const response = await api.get("/users/drivers");

      setDrivers(response.data.drivers || []);
    } catch (error) {
      console.error("Load drivers error:", error);

      setError(error.response?.data?.message || "Unable to load drivers");
    }
  };

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        await loadDrivers();
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // ==========================================
  // HANDLE INPUT
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
      name: "",
      email: "",
      phone: "",
      password: "",
    });

    setEditingDriver(null);

    setShowForm(false);

    setError("");
  };

  // ==========================================
  // EDIT DRIVER
  // ==========================================

  const handleEdit = (driver) => {
    setEditingDriver(driver);

    setForm({
      name: driver.name || "",

      email: driver.email || "",

      phone: driver.phone || "",

      password: "",
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ==========================================
  // SAVE DRIVER
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!form.name.trim()) {
      setError("Driver name is required");

      return;
    }

    if (!form.email.trim()) {
      setError("Email is required");

      return;
    }

    if (!form.phone.trim()) {
      setError("Phone number is required");

      return;
    }

    // Password required only
    // when creating a driver

    if (!editingDriver && !form.password) {
      setError("Password is required");

      return;
    }

    try {
      setSaving(true);

      if (editingDriver) {
        await api.put(`/users/drivers/${editingDriver._id}`, {
          name: form.name.trim(),

          email: form.email.trim(),

          phone: form.phone.trim(),
        });
      } else {
        await api.post("/users/drivers", {
          name: form.name.trim(),

          email: form.email.trim(),

          phone: form.phone.trim(),

          password: form.password,
        });
      }

      await loadDrivers();

      resetForm();
    } catch (error) {
      console.error("Save driver error:", error);

      setError(error.response?.data?.message || "Unable to save driver");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // CHANGE STATUS
  // ==========================================

  const handleStatusChange = async (driver) => {
    const newStatus = driver.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";

    try {
      await api.patch(`/users/drivers/${driver._id}/status`, {
        status: newStatus,
      });

      await loadDrivers();
    } catch (error) {
      console.error("Driver status error:", error);

      setError(
        error.response?.data?.message || "Unable to update driver status",
      );
    }
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <main className="page-container">
        <div className="loading-state">Loading drivers...</div>
      </main>
    );
  }

  return (
    <main className="page-container admin-drivers-page">
      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <div className="admin-page-header">
        <div>
          <Link to="/admin" className="back-button">
            ← Admin Dashboard
          </Link>

          <p className="eyebrow">OPERATIONS</p>

          <h1>Drivers</h1>

          <p>Manage your drivers and their account status.</p>
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
          {showForm ? "Close" : "+ Add Driver"}
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
        <section className="card driver-form-card">
          <div className="section-title">
            <p className="eyebrow">
              {editingDriver ? "EDIT DRIVER" : "NEW DRIVER"}
            </p>

            <h2>{editingDriver ? "Update driver" : "Create driver"}</h2>
          </div>

          <form onSubmit={handleSubmit} className="driver-form">
            {/* NAME */}

            <div className="input-group">
              <label>Full Name</label>

              <input
                name="name"
                type="text"
                placeholder="Raj Kumar"
                value={form.name}
                onChange={handleChange}
              />
            </div>

            {/* EMAIL */}

            <div className="input-group">
              <label>Email</label>

              <input
                name="email"
                type="email"
                placeholder="driver@example.com"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            {/* PHONE */}

            <div className="input-group">
              <label>Phone</label>

              <input
                name="phone"
                type="tel"
                placeholder="9876500000"
                value={form.phone}
                onChange={handleChange}
              />
            </div>

            {/* PASSWORD */}

            {!editingDriver && (
              <div className="input-group">
                <label>Password</label>

                <input
                  name="password"
                  type="password"
                  placeholder="Create login password"
                  value={form.password}
                  onChange={handleChange}
                />
              </div>
            )}

            <div className="driver-form-info">
              <strong>Role</strong>

              <span>AGENT / Driver</span>
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
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingDriver
                    ? "Update Driver"
                    : "Create Driver"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ================================= */}
      {/* DRIVER LIST */}
      {/* ================================= */}

      <section className="driver-section">
        <div className="section-title">
          <p className="eyebrow">TEAM</p>

          <h2>All Drivers</h2>
        </div>

        {drivers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👨‍✈️</div>

            <h3>No drivers yet</h3>

            <p>Create a driver account to assign drivers to trips.</p>
          </div>
        ) : (
          <div className="driver-list">
            {drivers.map((driver) => (
              <article className="driver-card" key={driver._id}>
                <div className="driver-avatar-small">
                  {driver.name?.charAt(0)?.toUpperCase()}
                </div>

                <div className="driver-main">
                  <div className="driver-title-row">
                    <h3>{driver.name}</h3>

                    <span
                      className={
                        driver.status === "ACTIVE"
                          ? "status-badge status-confirmed"
                          : "status-badge status-cancelled"
                      }
                    >
                      {driver.status}
                    </span>
                  </div>

                  <p>{driver.email}</p>

                  <small>
                    {driver.phone}
                    {" · "}
                    AGENT
                  </small>
                </div>

                <div className="driver-actions">
                  <button
                    className="secondary-button"
                    onClick={() => handleEdit(driver)}
                  >
                    Edit
                  </button>

                  <button
                    className="driver-status-button"
                    onClick={() => handleStatusChange(driver)}
                  >
                    {driver.status === "ACTIVE" ? "Block" : "Activate"}
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

export default AdminDrivers;
