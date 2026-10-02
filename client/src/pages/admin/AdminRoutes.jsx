import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import api from "../../api/axios";

const AdminRoutes = () => {
  const [routes, setRoutes] = useState([]);

  const [stops, setStops] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [showRouteForm, setShowRouteForm] = useState(false);

  const [showStopForm, setShowStopForm] = useState(false);

  const [routeName, setRouteName] = useState("");

  const [stopName, setStopName] = useState("");

  const [selectedStops, setSelectedStops] = useState([]);

  const [savingRoute, setSavingRoute] = useState(false);

  const [savingStop, setSavingStop] = useState(false);

  // ==========================================
  // LOAD ROUTES + STOPS
  // ==========================================

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [routesResponse, stopsResponse] = await Promise.all([
        api.get("/routes"),
        api.get("/routes/stops"),
      ]);

      setRoutes(routesResponse.data?.routes || []);

      setStops(stopsResponse.data?.stops || []);
    } catch (error) {
      console.error("Load admin route data error:", error);

      setError(
        error.response?.data?.message || "Unable to load routes and stops",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ==========================================
  // CREATE STOP
  // ==========================================

  const handleCreateStop = async (event) => {
    event.preventDefault();

    const trimmedName = stopName.trim();

    if (!trimmedName) {
      setError("Please enter a stop name.");
      return;
    }

    try {
      setSavingStop(true);
      setError("");

      const response = await api.post("/routes/stops", {
        name: trimmedName,
      });

      const createdStop = response.data?.stop;

      if (createdStop) {
        setStops((current) => {
          const alreadyExists = current.some(
            (stop) =>
              stop.name.trim().toLowerCase() ===
              createdStop.name.trim().toLowerCase(),
          );

          if (alreadyExists) {
            return current;
          }

          return [...current, createdStop].sort((a, b) =>
            a.name.localeCompare(b.name),
          );
        });
      }

      setStopName("");

      setShowStopForm(false);

      // Refresh from backend so UI and database are synchronized.
      await loadData();
    } catch (error) {
      console.error("Create stop error:", error);

      setError(error.response?.data?.message || "Unable to create stop");
    } finally {
      setSavingStop(false);
    }
  };

  // ==========================================
  // TOGGLE STOP
  // ==========================================

  const toggleStop = (stopId) => {
    setSelectedStops((current) => {
      if (current.includes(stopId)) {
        return current.filter((id) => id !== stopId);
      }

      return [...current, stopId];
    });
  };

  // ==========================================
  // CREATE ROUTE
  // ==========================================

  const handleCreateRoute = async (event) => {
    event.preventDefault();

    if (!routeName.trim()) {
      setError("Please enter a route name.");
      return;
    }

    if (selectedStops.length < 2) {
      setError("A route needs at least two stops.");
      return;
    }

    try {
      setSavingRoute(true);
      setError("");

      const routeStops = selectedStops
        .map((stopId) => {
          const stop = stops.find((item) => item._id === stopId);

          return stop
            ? {
                name: stop.name,
              }
            : null;
        })
        .filter(Boolean);

      if (routeStops.length < 2) {
        setError("Please select at least two valid stops.");
        return;
      }

      await api.post("/routes", {
        name: routeName.trim(),
        stops: routeStops,
      });

      setRouteName("");

      setSelectedStops([]);

      setShowRouteForm(false);

      await loadData();
    } catch (error) {
      console.error("Create route error:", error);

      setError(error.response?.data?.message || "Unable to create route");
    } finally {
      setSavingRoute(false);
    }
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <main className="page-container admin-routes-page">
        <div className="loading-state">Loading routes and stops...</div>
      </main>
    );
  }

  return (
    <main className="page-container admin-routes-page">
      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <div className="admin-page-header">
        <div>
          <Link to="/admin" className="back-button">
            ← Admin Dashboard
          </Link>

          <p className="eyebrow">OPERATIONS</p>

          <h1>Routes & Stops</h1>

          <p>Manage the stops and routes used by your buses.</p>
        </div>

        <div className="admin-route-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowStopForm((current) => !current)}
          >
            {showStopForm ? "Close Stop Form" : "+ Create Stop"}
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={() => setShowRouteForm((current) => !current)}
          >
            {showRouteForm ? "Close" : "+ Create Route"}
          </button>
        </div>
      </div>

      {/* ================================= */}
      {/* ERROR */}
      {/* ================================= */}

      {error && <div className="error-message">{error}</div>}

      {/* ================================= */}
      {/* CREATE STOP */}
      {/* ================================= */}

      {showStopForm && (
        <section className="card route-form-card">
          <div className="section-title">
            <p className="eyebrow">NEW STOP</p>

            <h2>Create a stop</h2>

            <p>
              Add a boarding or dropping location that can be used while
              creating routes.
            </p>
          </div>

          <form onSubmit={handleCreateStop}>
            <div className="input-group">
              <label htmlFor="stop-name">Stop Name</label>

              <input
                id="stop-name"
                type="text"
                placeholder="Example: Haridwar Bus Stand"
                value={stopName}
                onChange={(event) => setStopName(event.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setShowStopForm(false);
                  setStopName("");
                  setError("");
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={savingStop || !stopName.trim()}
              >
                {savingStop ? "Creating..." : "Create Stop"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ================================= */}
      {/* CREATE ROUTE */}
      {/* ================================= */}

      {showRouteForm && (
        <section className="card route-form-card">
          <div className="section-title">
            <p className="eyebrow">NEW ROUTE</p>

            <h2>Create a route</h2>

            <p>Select stops in the order in which the bus will travel.</p>
          </div>

          <form onSubmit={handleCreateRoute}>
            <div className="input-group">
              <label htmlFor="route-name">Route Name</label>

              <input
                id="route-name"
                type="text"
                placeholder="Example: Haridwar - Delhi"
                value={routeName}
                onChange={(event) => setRouteName(event.target.value)}
              />
            </div>

            {/* ================================= */}
            {/* STOP SELECTION */}
            {/* ================================= */}

            <div className="route-stop-selection">
              <div>
                <h3>Select Stops</h3>

                <p>Select stops in the order of the route.</p>
              </div>

              {stops.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📍</div>

                  <h3>No stops available</h3>

                  <p>Create your first stop using the Create Stop button.</p>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowStopForm(true)}
                  >
                    + Create Stop
                  </button>
                </div>
              ) : (
                <div className="stop-selection-list">
                  {stops.map((stop) => {
                    const selected = selectedStops.includes(stop._id);

                    const selectedNumber = selected
                      ? selectedStops.indexOf(stop._id) + 1
                      : null;

                    return (
                      <button
                        type="button"
                        key={stop._id}
                        className={`stop-option ${selected ? "selected" : ""}`}
                        onClick={() => toggleStop(stop._id)}
                      >
                        <span className="stop-number">
                          {selected ? selectedNumber : "•"}
                        </span>

                        <span className="stop-name">{stop.name}</span>

                        <span>{selected ? "✓" : "+"}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ================================= */}
            {/* SELECTED STOPS */}
            {/* ================================= */}

            {selectedStops.length > 0 && (
              <div className="selected-stops-preview">
                <span>Route order:</span>

                {selectedStops.map((stopId, index) => {
                  const stop = stops.find((item) => item._id === stopId);

                  return (
                    <span key={stopId} className="selected-stop-chip">
                      {index + 1}. {stop?.name}
                    </span>
                  );
                })}
              </div>
            )}

            {/* ================================= */}
            {/* FORM ACTIONS */}
            {/* ================================= */}

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setShowRouteForm(false);
                  setSelectedStops([]);
                  setRouteName("");
                  setError("");
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={
                  savingRoute || stops.length < 2 || selectedStops.length < 2
                }
              >
                {savingRoute ? "Creating..." : "Create Route"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ================================= */}
      {/* AVAILABLE STOPS */}
      {/* ================================= */}

      <section className="admin-route-section">
        <div className="section-title">
          <p className="eyebrow">AVAILABLE LOCATIONS</p>

          <h2>Stops</h2>

          <p>These stops are available when creating a route.</p>
        </div>

        {stops.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📍</div>

            <h3>No stops created</h3>

            <p>Create your first stop to start building routes.</p>

            <button
              type="button"
              className="primary-button"
              onClick={() => setShowStopForm(true)}
            >
              + Create Stop
            </button>
          </div>
        ) : (
          <div className="stop-selection-list admin-stops-list">
            {stops.map((stop, index) => (
              <div className="stop-option" key={stop._id || index}>
                <span className="stop-number">{index + 1}</span>

                <span className="stop-name">{stop.name}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ================================= */}
      {/* EXISTING ROUTES */}
      {/* ================================= */}

      <section className="admin-route-section">
        <div className="section-title">
          <p className="eyebrow">EXISTING ROUTES</p>

          <h2>Routes</h2>
        </div>

        {routes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🗺️</div>

            <h3>No routes created</h3>

            <p>Create your first route to get started.</p>
          </div>
        ) : (
          <div className="admin-route-list">
            {routes.map((route) => (
              <article className="admin-route-card" key={route._id}>
                <div className="admin-route-icon">🗺️</div>

                <div className="admin-route-content">
                  <h3>{route.name}</h3>

                  <p>{route.stops?.length || 0} stops</p>
                </div>

                <div className="route-stops-preview">
                  {route.stops?.map((stop, index) => (
                    <span key={stop._id || index}>{stop.name || stop}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default AdminRoutes;
