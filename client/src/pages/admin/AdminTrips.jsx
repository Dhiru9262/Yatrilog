import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import api from "../../api/axios";

const AdminTrips = () => {
  const [trips, setTrips] = useState([]);

  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [editingTrip, setEditingTrip] = useState(null);

  const [form, setForm] = useState({
    route: "",
    vehicle: "",
    driver: "",
    date: "",
    departureTime: "",
    arrivalTime: "",
    isDailySchedule: false,
    scheduleEndDate: "",
  });

  const [stopTimings, setStopTimings] = useState([]);

  // ==========================================
  // LOAD DATA
  // ==========================================

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [tripsResponse, routesResponse, vehiclesResponse, driversResponse] =
        await Promise.all([
          api.get("/trips"),
          api.get("/routes"),
          api.get("/vehicles"),
          api.get("/users/drivers"),
        ]);

      setTrips(tripsResponse.data.trips || []);

      setRoutes(routesResponse.data.routes || []);

      setVehicles(vehiclesResponse.data.vehicles || []);

      setDrivers(driversResponse.data.drivers || []);
    } catch (error) {
      console.error("Load trip data error:", error);

      setError(error.response?.data?.message || "Unable to load trip data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ==========================================
  // SELECTED ROUTE
  // ==========================================

  const selectedRoute = routes.find(
    (route) => String(route._id) === String(form.route),
  );

  // ==========================================
  // GENERATE STOP TIMINGS
  // ==========================================

  const createEmptyStopTimings = (route) => {
    if (!route?.stops) {
      return [];
    }

    return route.stops.map((stop, index) => ({
      stop: stop._id,

      name: stop.name,

      sequence: stop.sequence,

      arrivalTime:
        index === 0 ? "" : index === route.stops.length - 1 ? "" : "",

      departureTime: index === route.stops.length - 1 ? "" : "",
    }));
  };

  // ==========================================
  // LOAD TIMINGS FROM TRIP
  // ==========================================

  const createTimingsFromTrip = (trip, route) => {
    if (!route?.stops || !Array.isArray(trip?.stopTimings)) {
      return createEmptyStopTimings(route);
    }

    return route.stops.map((stop) => {
      const existing = trip.stopTimings.find(
        (timing) => String(timing.stop) === String(stop._id),
      );

      return {
        stop: stop._id,

        name: stop.name,

        sequence: stop.sequence,

        arrivalTime: existing?.arrivalTime || "",

        departureTime: existing?.departureTime || "",
      };
    });
  };

  // ==========================================
  // INPUT CHANGE
  // ==========================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    // ----------------------------------------
    // Route changed
    // ----------------------------------------

    if (name === "route") {
      const route = routes.find((item) => String(item._id) === String(value));

      setStopTimings(createEmptyStopTimings(route));

      // Reset overall times because
      // they are now controlled by
      // first/last stop timings.
      setForm((current) => ({
        ...current,
        route: value,
        departureTime: "",
        arrivalTime: "",
      }));
    }
  };

  // ==========================================
  // STOP TIMING CHANGE
  // ==========================================

  const handleStopTimingChange = (index, field, value) => {
    setStopTimings((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );

    // First stop departure becomes
    // overall trip departure.
    if (index === 0 && field === "departureTime") {
      setForm((current) => ({
        ...current,
        departureTime: value,
      }));
    }

    // Last stop arrival becomes
    // overall trip arrival.
    if (
      selectedRoute &&
      index === selectedRoute.stops.length - 1 &&
      field === "arrivalTime"
    ) {
      setForm((current) => ({
        ...current,
        arrivalTime: value,
      }));
    }
  };

  // ==========================================
  // RESET
  // ==========================================

  const resetForm = () => {
    setForm({
      route: "",
      vehicle: "",
      driver: "",
      date: "",
      departureTime: "",
      arrivalTime: "",
      isDailySchedule: false,
      scheduleEndDate: "",
    });

    setStopTimings([]);

    setEditingTrip(null);

    setShowForm(false);

    setError("");
  };

  // ==========================================
  // EDIT TRIP
  // ==========================================

  const handleEdit = (trip) => {
    const routeId = trip.route?._id || trip.route || "";

    const route = routes.find((item) => String(item._id) === String(routeId));

    setEditingTrip(trip);

    const tripDate = trip.date
      ? new Date(trip.date).toISOString().split("T")[0]
      : "";

    setForm({
      route: routeId,
      vehicle: trip.vehicle?._id || trip.vehicle || "",
      driver: trip.driver?._id || trip.driver || "",
      date: tripDate,
      departureTime: trip.departureTime || "",
      arrivalTime: trip.arrivalTime || "",
      isDailySchedule: false,
      scheduleEndDate: "",
    });

    setStopTimings(createTimingsFromTrip(trip, route));

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ==========================================
  // VALIDATE TIMINGS
  // ==========================================

  const validateTimings = () => {
    if (!selectedRoute || !selectedRoute.stops?.length) {
      return "Please select a route.";
    }

    if (stopTimings.length !== selectedRoute.stops.length) {
      return "Please provide timing for every stop.";
    }

    for (let index = 0; index < stopTimings.length; index += 1) {
      const timing = stopTimings[index];

      const isFirst = index === 0;

      const isLast = index === stopTimings.length - 1;

      if (isFirst && !timing.departureTime) {
        return `Please enter departure time for ${timing.name}.`;
      }

      if (isLast && !timing.arrivalTime) {
        return `Please enter arrival time for ${timing.name}.`;
      }

      if (!isFirst && !timing.arrivalTime) {
        return `Please enter arrival time for ${timing.name}.`;
      }

      if (!isLast && !timing.departureTime) {
        return `Please enter departure time for ${timing.name}.`;
      }
    }

    return "";
  };

  // ==========================================
  // CREATE / UPDATE
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!form.route) {
      setError("Please select a route");
      return;
    }

    if (!form.vehicle) {
      setError("Please select a vehicle");
      return;
    }

    if (!form.driver) {
      setError("Please select a driver");
      return;
    }

    if (!form.date) {
      setError("Please select a date");
      return;
    }

    const timingError = validateTimings();

    if (timingError) {
      setError(timingError);
      return;
    }

    // First/last times are taken
    // directly from stop timings.
    const firstStop = stopTimings[0];

    const lastStop = stopTimings[stopTimings.length - 1];

    const departureTime = firstStop.departureTime;

    const arrivalTime = lastStop.arrivalTime;

    setForm((current) => ({
      ...current,
      departureTime,
      arrivalTime,
    }));

    try {
      setSaving(true);

      const payload = {
        route: form.route,

        vehicle: form.vehicle,

        driver: form.driver,

        date: form.date,

        departureTime,

        arrivalTime,

        isDailySchedule: Boolean(form.isDailySchedule && !editingTrip),
        scheduleEndDate: form.scheduleEndDate || form.date,

        stopTimings: stopTimings.map((timing) => ({
          stop: timing.stop,

          arrivalTime: timing.arrivalTime || null,

          departureTime: timing.departureTime || null,
        })),
      };

      if (editingTrip) {
        await api.put(`/trips/${editingTrip._id}`, payload);
      } else {
        await api.post("/trips", payload);
      }

      await loadData();

      resetForm();
    } catch (error) {
      console.error("Save trip error:", error);

      setError(error.response?.data?.message || "Unable to save trip");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // STATUS
  // ==========================================

  const handleStatusChange = async (trip, status) => {
    try {
      await api.patch(`/trips/${trip._id}/status`, {
        status,
      });

      await loadData();
    } catch (error) {
      console.error("Trip status error:", error);

      setError(error.response?.data?.message || "Unable to change trip status");
    }
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <main className="page-container">
        <div className="loading-state">Loading trips...</div>
      </main>
    );
  }

  return (
    <main className="page-container admin-trips-page">
      {/* HEADER */}

      <div className="admin-page-header">
        <div>
          <Link to="/admin" className="back-button">
            ← Admin Dashboard
          </Link>

          <p className="eyebrow">OPERATIONS</p>

          <h1>Trips</h1>

          <p>Schedule routes, vehicles, drivers and stop timings.</p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
        >
          {showForm ? "Close" : "+ Create Trip"}
        </button>
      </div>

      {/* ERROR */}

      {error && <div className="error-message">{error}</div>}

      {/* FORM */}

      {showForm && (
        <section className="card trip-form-card">
          <div className="section-title">
            <p className="eyebrow">{editingTrip ? "EDIT TRIP" : "NEW TRIP"}</p>

            <h2>{editingTrip ? "Update trip" : "Schedule a trip"}</h2>
          </div>

          <form onSubmit={handleSubmit} className="trip-form">
            {/* ROUTE */}

            <div className="input-group">
              <label>Route</label>

              <select name="route" value={form.route} onChange={handleChange}>
                <option value="">Select route</option>

                {routes.map((route) => (
                  <option key={route._id} value={route._id}>
                    {route.name}
                  </option>
                ))}
              </select>
            </div>

            {/* VEHICLE */}

            <div className="input-group">
              <label>Vehicle</label>

              <select
                name="vehicle"
                value={form.vehicle}
                onChange={handleChange}
              >
                <option value="">Select vehicle</option>

                {vehicles
                  .filter((vehicle) => vehicle.status === "ACTIVE")
                  .map((vehicle) => (
                    <option key={vehicle._id} value={vehicle._id}>
                      {vehicle.vehicleNumber}
                      {" — "}
                      {vehicle.type}
                      {" · "}
                      {vehicle.totalSeats}
                      {" seats"}
                    </option>
                  ))}
              </select>
            </div>

            {/* DRIVER */}

            <div className="input-group">
              <label>Driver</label>

              <select name="driver" value={form.driver} onChange={handleChange}>
                <option value="">Select driver</option>

                {drivers
                  .filter((driver) => driver.status === "ACTIVE")
                  .map((driver) => (
                    <option key={driver._id} value={driver._id}>
                      {driver.name}
                      {" — "}
                      {driver.phone}
                    </option>
                  ))}
              </select>
            </div>

            {/* DATE */}

            <div className="input-group">
              <label>Date</label>

              <input
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            {/* DAILY SCHEDULE */}
            {!editingTrip && (
              <div className="input-group" style={{ gridColumn: "1 / -1" }}>
                <label style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <input type="checkbox" name="isDailySchedule" checked={form.isDailySchedule} onChange={(e)=>setForm(current=>({...current,isDailySchedule:e.target.checked}))} />
                  Repeat this trip every day at the exact same time
                </label>
                {form.isDailySchedule && (
                  <div style={{ marginTop:10 }}>
                    <label>Schedule until</label>
                    <input name="scheduleEndDate" type="date" value={form.scheduleEndDate} min={form.date || new Date().toISOString().split("T")[0]} onChange={handleChange} />
                  </div>
                )}
              </div>
            )}

            {/* ================================= */}
            {/* STOP SCHEDULE */}
            {/* ================================= */}

            {selectedRoute && selectedRoute.stops?.length > 0 && (
              <section className="trip-stop-schedule">
                <div className="section-title">
                  <p className="eyebrow">STOP SCHEDULE</p>

                  <h3>Set time for every stop</h3>

                  <p>
                    The first stop uses departure time and the final stop uses
                    arrival time.
                  </p>
                </div>

                <div className="admin-stop-timing-list">
                  {stopTimings.map((timing, index) => {
                    const isFirst = index === 0;

                    const isLast = index === stopTimings.length - 1;

                    return (
                      <div className="admin-stop-timing-row" key={timing.stop}>
                        <div className="admin-stop-number">
                          {timing.sequence}
                        </div>

                        <div className="admin-stop-name">
                          <strong>{timing.name}</strong>

                          <span>Stop {timing.sequence}</span>
                        </div>

                        <div className="admin-stop-time-field">
                          <label>Arrival</label>

                          <input
                            type="time"
                            value={timing.arrivalTime}
                            disabled={isFirst}
                            onChange={(event) =>
                              handleStopTimingChange(
                                index,
                                "arrivalTime",
                                event.target.value,
                              )
                            }
                          />
                        </div>

                        <div className="admin-stop-time-field">
                          <label>Departure</label>

                          <input
                            type="time"
                            value={timing.departureTime}
                            disabled={isLast}
                            onChange={(event) =>
                              handleStopTimingChange(
                                index,
                                "departureTime",
                                event.target.value,
                              )
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

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
                  : editingTrip
                    ? "Update Trip"
                    : "Create Trip"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* TRIPS */}

      <section className="trip-section">
        <div className="section-title">
          <p className="eyebrow">SCHEDULE</p>

          <h2>All Trips</h2>
        </div>

        {trips.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>

            <h3>No trips scheduled</h3>

            <p>Create a trip to make it available for operations.</p>
          </div>
        ) : (
          <div className="trip-list">
            {trips.map((trip) => (
              <article className="admin-trip-card" key={trip._id}>
                <div className="admin-trip-header">
                  <div>
                    <span className="trip-label">ROUTE</span>

                    <h3>{trip.route?.name}</h3>
                  </div>

                  <span
                    className={`trip-status-badge trip-status-${trip.status?.toLowerCase()}`}
                  >
                    {trip.status}
                  </span>
                </div>

                <div className="admin-trip-main">
                  <div className="trip-time-block">
                    <span>DEPARTURE</span>

                    <strong>{trip.departureTime}</strong>
                  </div>

                  <div className="trip-arrow">→</div>

                  <div className="trip-time-block">
                    <span>ARRIVAL</span>

                    <strong>{trip.arrivalTime || "--"}</strong>
                  </div>
                </div>

                {/* STOP SCHEDULE PREVIEW */}

                {Array.isArray(trip.stopTimings) &&
                  trip.stopTimings.length > 0 && (
                    <div className="admin-trip-stop-preview">
                      {trip.stopTimings.map((timing, index) => {
                        const stop = trip.route?.stops?.[index];

                        return (
                          <div key={timing.stop || index}>
                            <span>{stop?.name || `Stop ${index + 1}`}</span>

                            <strong>
                              {timing.departureTime ||
                                timing.arrivalTime ||
                                "--"}
                            </strong>
                          </div>
                        );
                      })}
                    </div>
                  )}

                <div className="admin-trip-details">
                  <div>
                    <span>DATE</span>

                    <strong>{new Date(trip.date).toLocaleDateString()}</strong>
                  </div>

                  <div>
                    <span>VEHICLE</span>

                    <strong>{trip.vehicle?.vehicleNumber}</strong>
                  </div>

                  <div>
                    <span>DRIVER</span>

                    <strong>{trip.driver?.name}</strong>
                  </div>
                </div>

                <div className="admin-trip-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => handleEdit(trip)}
                  >
                    Edit
                  </button>

                  {trip.status === "DRAFT" && (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => handleStatusChange(trip, "SCHEDULED")}
                    >
                      Schedule
                    </button>
                  )}

                  {trip.status === "SCHEDULED" && (
                    <button
                      type="button"
                      className="cancel-booking-button"
                      onClick={() => handleStatusChange(trip, "CANCELLED")}
                    >
                      Cancel Trip
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default AdminTrips;
