import { useEffect, useState } from "react";

import api from "../api/axios";

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);

  const [unreadCount, setUnreadCount] = useState(0);

  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  // ======================================
  // LOAD NOTIFICATIONS
  // ======================================

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/notifications");

      setNotifications(response.data.notifications || []);

      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error("Load notifications error:", error);

      setError(error.response?.data?.message || "Unable to load notifications");
    } finally {
      setLoading(false);
    }
  };

  // ======================================
  // INITIAL LOAD
  // ======================================

  useEffect(() => {
    loadNotifications();
  }, []);

  // ======================================
  // MARK ONE NOTIFICATION AS READ
  // ======================================

  const markAsRead = async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification._id === notificationId
            ? {
                ...notification,
                read: true,
              }
            : notification,
        ),
      );

      setUnreadCount((currentCount) => Math.max(0, currentCount - 1));
    } catch (error) {
      console.error("Mark notification as read error:", error);
    }
  };

  // ======================================
  // MARK ALL NOTIFICATIONS AS READ
  // ======================================

  const markAllAsRead = async () => {
    try {
      await api.patch("/notifications/read-all");

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          read: true,
        })),
      );

      setUnreadCount(0);
    } catch (error) {
      console.error("Mark all notifications as read error:", error);
    }
  };

  // ======================================
  // TOGGLE NOTIFICATION PANEL
  // ======================================

  const handleToggle = () => {
    const nextState = !open;

    setOpen(nextState);

    if (nextState) {
      loadNotifications();
    }
  };

  // ======================================
  // RENDER
  // ======================================

  return (
    <div className="notification-container">
      {/* ================================== */}
      {/* NOTIFICATION BELL */}
      {/* ================================== */}

      <button
        type="button"
        className="notification-button"
        onClick={handleToggle}
        aria-label="Notifications"
      >
        <span className="notification-bell-icon">🔔</span>

        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* ================================== */}
      {/* NOTIFICATION PANEL */}
      {/* ================================== */}

      {open && (
        <div className="notification-panel">
          {/* ================================== */}
          {/* HEADER */}
          {/* ================================== */}

          <div className="notification-header">
            <div>
              <h3>Notifications</h3>

              {unreadCount > 0 && <span>{unreadCount} unread</span>}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-read-all"
                onClick={markAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* ================================== */}
          {/* ERROR */}
          {/* ================================== */}

          {error && <div className="notification-error">{error}</div>}

          {/* ================================== */}
          {/* LOADING */}
          {/* ================================== */}

          {loading ? (
            <div className="notification-loading">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">
              <div className="notification-empty-icon">🔔</div>

              <p>No notifications yet.</p>
            </div>
          ) : (
            /* ================================== */
            /* NOTIFICATION LIST */
            /* ================================== */

            <div className="notification-list">
              {notifications.map((notification) => (
                <div
                  className={`notification-item ${
                    notification.read ? "read" : "unread"
                  }`}
                  key={notification._id}
                >
                  {/* ============================ */}
                  {/* ICON */}
                  {/* ============================ */}

                  <div className="notification-item-icon">
                    {notification.type === "PAYMENT_SUCCESS"
                      ? "💳"
                      : notification.type === "BOOKING_CONFIRMED"
                        ? "🎫"
                        : notification.type === "TICKET_GENERATED"
                          ? "🎟️"
                          : "🔔"}
                  </div>

                  {/* ============================ */}
                  {/* CONTENT */}
                  {/* ============================ */}

                  <div className="notification-item-content">
                    <strong>{notification.title}</strong>

                    <p>{notification.message}</p>

                    <small>
                      {notification.createdAt
                        ? new Date(notification.createdAt).toLocaleString()
                        : ""}
                    </small>

                    {/* ========================== */}
                    {/* MARK AS READ */}
                    {/* ========================== */}

                    {!notification.read && (
                      <button
                        type="button"
                        className="notification-mark-read"
                        onClick={() => markAsRead(notification._id)}
                      >
                        Mark as read
                      </button>
                    )}
                  </div>

                  {/* ============================ */}
                  {/* UNREAD INDICATOR */}
                  {/* ============================ */}

                  {!notification.read && (
                    <span className="notification-unread-dot" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
