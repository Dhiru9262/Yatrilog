import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const BottomNavigation = () => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user) return null;

  const items = user.role === "CUSTOMER"
    ? [["/customer", "Home", "⌂"], ["/customer/search", "Search", "⌕"], ["/customer/bookings", "Tickets", "▣"]]
    : user.role === "AGENT"
      ? [["/agent", "Home", "⌂"], ["/agent/trips", "Trips", "▣"]]
      : user.role === "OWNER"
        ? [["/owner", "Home", "⌂"], ["/owner/trips", "Trips", "▣"]]
        : [["/admin", "Dashboard", "⌂"], ["/admin/trips", "Trips", "◷"]];

  return (
    <nav className="bottom-navigation">
      {items.map(([to, label, icon]) => (
        <NavLink key={to} to={to} end className={({ isActive }) => `bottom-nav-item ${isActive ? "active" : ""}`}>
          <span className="bottom-nav-icon">{icon}</span>
          <span className="bottom-nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNavigation;
