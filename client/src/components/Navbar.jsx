import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";
import BrandLogo from "./BrandLogo";
import LanguageToggle from "./LanguageToggle";

const navClass = ({ isActive }) => `nav-link ${isActive ? "active" : ""}`;

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <header className="public-header">
        <Link to="/login" className="brand-mark">
          <BrandLogo className="nav-logo" />
        </Link>
        <LanguageToggle />
      </header>
    );
  }

  const role = user?.role;
  const isBackOffice = role === "ADMIN" || role === "OWNER";
  const close = () => setMobileMenuOpen(false);

  const menu = {
    CUSTOMER: [
      ["/customer", "Home", "⌂"],
      ["/customer/search", "Search", "⌕"],
      ["/customer/bookings", "Bookings", "▣"],
    ],
    AGENT: [
      ["/agent", "Home", "⌂"],
      ["/agent/trips", "My Trips", "▣"],
      ["/agent/daily-bookings", "Daily Bookings", "▤"],
      ["/agent/revenue", "Revenue", "₹"],
    ],
    OWNER: [
      ["/owner", "Dashboard", "⌂"],
      ["/owner/trips", "My Trips", "▣"],
      ["/owner/daily-bookings", "Daily Bookings", "▤"],
      ["/owner/vans", "All Vans", "🚌"],
      ["/owner/revenue", "Revenue", "₹"],
    ],
    ADMIN: [
      ["/admin", "Dashboard", "⌂"],
      ["/admin/routes", "Routes & Stops", "⌖"],
      ["/admin/vehicles", "Vehicles", "▰"],
      ["/admin/drivers", "Drivers", "♙"],
      ["/admin/trips", "Trips", "◷"],
      ["/admin/daily-bookings", "Bookings", "▤"],
    ],
  }[role] || [];

  if (isBackOffice) {
    return (
      <>
        <aside className="role-sidebar">
          <Link to={role === "ADMIN" ? "/admin" : "/owner"} className="sidebar-brand">
            <BrandLogo className="nav-logo" />
          </Link>

          <div className="sidebar-top-row">
            <LanguageToggle compact />
          </div>

          <div className="sidebar-profile">
            <div className="avatar">{user?.name?.charAt(0)?.toUpperCase() || "U"}</div>
            <div>
              <strong>{user?.name || "User"}</strong>
              <span>{role === "ADMIN" ? "System Admin" : "Fleet Owner"}</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <p className="sidebar-label">WORKSPACE</p>
            {menu.map(([to, label, icon]) => (
              <NavLink key={to} to={to} end={to === `/${role.toLowerCase()}`} className={navClass}>
                <span>{icon}</span>{label}
              </NavLink>
            ))}
            {role === "OWNER" && <p className="sidebar-note">Set segment fares from a trip's fare management screen.</p>}
          </nav>

          <button className="sidebar-logout" type="button" onClick={logout}>↪ <span>Logout</span></button>
        </aside>

        <header className="mobile-header backoffice-mobile-header">
          <Link to={role === "ADMIN" ? "/admin" : "/owner"} className="mobile-brand"><BrandLogo className="mobile-logo" /></Link>
          <div className="mobile-header-actions">
            <LanguageToggle compact />
            <NotificationBell />
            <button className="mobile-menu-button" type="button" onClick={() => setMobileMenuOpen((v) => !v)} aria-label="Open menu">
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="mobile-menu-overlay" onClick={close}>
            <div className="mobile-menu" onClick={(event) => event.stopPropagation()}>
              <div className="mobile-menu-user">
                <div className="mobile-user-avatar">{user?.name?.charAt(0)?.toUpperCase() || "U"}</div>
                <div><strong>{user?.name || "User"}</strong><span>{role}</span></div>
              </div>
              {menu.map(([to, label, icon]) => <Link key={to} to={to} className="mobile-menu-link" onClick={close}><span>{icon}</span>{label}</Link>)}
              <div className="mobile-menu-divider" />
              <button className="mobile-menu-logout" type="button" onClick={() => { close(); logout(); }}>↪ Logout</button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to={role === "CUSTOMER" ? "/customer" : "/agent"} className="brand-mark">
            <BrandLogo className="nav-logo" />
          </Link>
          <div className="nav-right">
            {menu.map(([to, label]) => <NavLink key={to} to={to} end={to === `/${role.toLowerCase()}`} className={navClass}>{label}</NavLink>)}
            <LanguageToggle compact />
            <NotificationBell />
            <div className="desktop-avatar">{user?.name?.charAt(0)?.toUpperCase() || "U"}</div>
            <button type="button" className="nav-logout" onClick={logout}>Logout</button>
          </div>
        </div>
      </nav>

      <header className="mobile-header">
        <Link to={role === "CUSTOMER" ? "/customer" : "/agent"} className="mobile-brand"><BrandLogo className="mobile-logo" /></Link>
        <div className="mobile-header-actions">
          <LanguageToggle compact />
          <NotificationBell />
          <button type="button" className="mobile-menu-button" onClick={() => setMobileMenuOpen((v) => !v)} aria-label="Open menu">
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={close}>
          <div className="mobile-menu" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-menu-user">
              <div className="mobile-user-avatar">{user?.name?.charAt(0)?.toUpperCase() || "U"}</div>
              <div><strong>{user?.name || "User"}</strong><span>{role}</span></div>
            </div>
            {menu.map(([to, label, icon]) => <Link key={to} to={to} className="mobile-menu-link" onClick={close}><span>{icon}</span>{label}</Link>)}
            <div className="mobile-menu-divider" />
            <button type="button" className="mobile-menu-logout" onClick={() => { close(); logout(); }}>↪ Logout</button>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
