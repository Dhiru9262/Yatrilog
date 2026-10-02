import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";

import RoleRoute from "./components/RoleRoute";

import Login from "./pages/auth/Login";

import CustomerDashboard from "./pages/customer/CustomerDashboard";

import AgentDashboard from "./pages/agent/AgentDashboard";

import SearchTrips from "./pages/customer/SearchTrips";

import TripDetails from "./pages/customer/TripDetails";

import SeatLock from "./pages/customer/SeatLock";

import Payment from "./pages/customer/Payment";

import BookingSuccess from "./pages/customer/BookingSuccess";

import MyTrips from "./pages/agent/MyTrips";

import TripPassengers from "./pages/agent/TripPassengers";

import Navbar from "./components/Navbar";
import DailyBookings from "./pages/DailyBookings";
import MyBookings from "./pages/customer/MyBookings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRoutes from "./pages/admin/AdminRoutes";
import AdminVehicles from "./pages/admin/AdminVehicles";
import AdminDrivers from "./pages/admin/AdminDrivers";
import AdminTrips from "./pages/admin/AdminTrips";
import AdminSeatLayout from "./pages/admin/AdminSeatLayout";
import NewBooking from "./pages/agent/NewBooking";
import BookingDetails from "./pages/customer/BookingDetails";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerTrips from "./pages/owner/OwnerTrips";
import OwnerFareManagement from "./pages/owner/OwnerFareManagement";
import OwnerVans from "./pages/owner/OwnerVans";
import Revenue from "./pages/Revenue";
import BottomNavigation from "./components/BottomNavigation";
import Signup from "./pages/auth/Signup";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ResetPassword from "./pages/auth/ResetPassword";
import SplashScreen from "./components/SplashScreen";
import { useEffect, useState } from "react";
import { LanguageProvider } from "./context/LanguageContext";

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <LanguageProvider>
      <BrowserRouter>
        <AuthProvider>
        <Navbar />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Authenticated */}
          <Route element={<ProtectedRoute />}>
            {/* Admin */}

            <Route element={<RoleRoute allowedRoles={["ADMIN"]} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/routes" element={<AdminRoutes />} />
              <Route path="/admin/vehicles" element={<AdminVehicles />} />
              <Route path="/admin/seat-layout" element={<AdminSeatLayout />} />
              <Route path="/admin/drivers" element={<AdminDrivers />} />
              <Route path="/admin/trips" element={<AdminTrips />} />
              <Route path="/admin/daily-bookings" element={<DailyBookings />} />
            </Route>

            {/* owner  */}
            {/* OWNER */}
            <Route element={<RoleRoute allowedRoles={["OWNER"]} />}>
              <Route path="/owner" element={<OwnerDashboard />} />
              <Route path="/owner/trips" element={<OwnerTrips />} />
              <Route path="/owner/daily-bookings" element={<DailyBookings />} />
              <Route path="/owner/vans" element={<OwnerVans />} />
              <Route path="/owner/revenue" element={<Revenue />} />
              <Route path="/owner/trips/:tripId/new-booking" element={<NewBooking />} />

              <Route
                path="/owner/trips/:tripId/fares"
                element={<OwnerFareManagement />}
              />
            </Route>

            {/* CUSTOMER */}
            <Route element={<RoleRoute allowedRoles={["CUSTOMER"]} />}>
              <Route path="/customer" element={<CustomerDashboard />} />
              <Route path="/customer/search" element={<SearchTrips />} />
              <Route path="/customer/trips/:tripId" element={<TripDetails />} />
              <Route
                path="/customer/trips/:tripId/lock"
                element={<SeatLock />}
              />

              <Route path="/customer/payment/:tripId" element={<Payment />} />
              <Route
                path="/customer/booking-success/:bookingId"
                element={<BookingSuccess />}
              />
              <Route path="/customer/bookings" element={<MyBookings />} />
              <Route
                path="/customer/bookings/:bookingId"
                element={<BookingDetails />}
              />
            </Route>

            {/* AGENT */}
            <Route element={<RoleRoute allowedRoles={["AGENT"]} />}>
              <Route path="/agent" element={<AgentDashboard />} />
              <Route path="/agent/trips" element={<MyTrips />} />
              <Route path="/agent/daily-bookings" element={<DailyBookings />} />
              <Route path="/agent/revenue" element={<Revenue />} />
              <Route
                path="/agent/trips/:tripId/passengers"
                element={<TripPassengers />}
              />
              <Route
                path="/agent/trips/:tripId/new-booking"
                element={<NewBooking />}
              />
            </Route>
          </Route>

          <Route path="*" element={<Login />} />
        </Routes>
          <BottomNavigation />
        </AuthProvider>
      </BrowserRouter>
    </LanguageProvider>
  );
};

export default App;
