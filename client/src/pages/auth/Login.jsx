import { useState } from "react";
import api from "../../api/axios";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import BrandLogo from "../../components/BrandLogo";

const Login = () => {
  const navigate = useNavigate();

  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // ======================================
  // HANDLE INPUT
  // ======================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
  };

  // ======================================
  // LOGIN
  // ======================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!formData.email || !formData.password) {
      setError("Please enter your email and password.");

      return;
    }

    try {
      setLoading(true);

      const response = await login(formData.email.trim(), formData.password);

      console.log("Login response:", response);

      const loggedInUser = response?.user;

      if (!loggedInUser) {
        throw new Error("User information was not returned by the server.");
      }

      console.log("Logged in user:", loggedInUser);

      // ==================================
      // CUSTOMER
      // ==================================

      if (loggedInUser.role === "CUSTOMER") {
        navigate("/customer", {
          replace: true,
        });

        return;
      }

      // ==================================
      // OWNER
      // ==================================

      if (loggedInUser.role === "OWNER") {
        navigate("/owner", {
          replace: true,
        });

        return;
      }

      // ==================================
      // AGENT
      // ==================================

      if (loggedInUser.role === "AGENT") {
        navigate("/agent", {
          replace: true,
        });

        return;
      }

      // ==================================
      // ADMIN
      // ==================================

      if (loggedInUser.role === "ADMIN") {
        navigate("/admin", {
          replace: true,
        });

        return;
      }

      // ==================================
      // UNKNOWN ROLE
      // ==================================

      setError("Your account has an invalid role.");
    } catch (error) {
      console.error("Login error:", error);

      if (error.response?.data?.code === "EMAIL_NOT_VERIFIED") {
        navigate(`/verify-email?email=${encodeURIComponent(formData.email.trim())}`, { replace: true });
        return;
      }

      setError(
        error.response?.data?.message ||
          error.message ||
          "Unable to login. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-container">
        {/* ==================================
            BRAND PANEL
            ================================== */}

        <div className="auth-brand-panel">
          <div className="auth-brand-content">
            <BrandLogo className="auth-logo" />

            <h1>
              Travel
              <br />
              with confidence.
            </h1>

            <p>
              Search buses, choose your seat, and book your journey with ease.
            </p>
          </div>

          <div className="auth-brand-decoration">
            <span>✦</span>
            <span>✦</span>
            <span>✦</span>
          </div>
        </div>

        {/* ==================================
            LOGIN FORM
            ================================== */}

        <div className="auth-form-panel">
          <div className="auth-form-header">
            <p className="eyebrow">WELCOME BACK</p>

            <h2>Sign in</h2>

            <p>Login to manage your journeys and bookings.</p>
          </div>

          {/* ERROR */}

          {error && <div className="auth-error">{error}</div>}

          {/* FORM */}

          <form className="auth-form" onSubmit={handleSubmit}>
            {/* EMAIL */}

            <div className="auth-field">
              <label htmlFor="email">Email address</label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            {/* PASSWORD */}

            <div className="auth-field">
              <div className="auth-label-row">
                <label htmlFor="password">Password</label>

                <button
                  type="button"
                  className="auth-forgot"
                  onClick={() => { setShowForgot(true); setError(""); setForgotMessage(""); }}
                >
                  Forgot password?
                </button>
              </div>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            {/* LOGIN */}

            <button
              type="submit"
              className="primary-button auth-submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}

              {!loading && <span>→</span>}
            </button>
          </form>

          {showForgot && (
            <div className="auth-forgot-panel">
              <div className="auth-form-header">
                <p className="eyebrow">PASSWORD RECOVERY</p>
                <h3>Forgot your password?</h3>
                <p>Enter your email and we will send you a secure reset link.</p>
              </div>
              <div className="auth-field">
                <label htmlFor="forgotEmail">Email address</label>
                <input id="forgotEmail" type="email" value={forgotEmail} onChange={(e)=>setForgotEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              {forgotMessage && <div className="auth-success">{forgotMessage}</div>}
              <div style={{display:"flex",gap:10}}>
                <button type="button" className="primary-button" disabled={forgotLoading} onClick={async()=>{try{setForgotLoading(true);const r=await api.post("/auth/forgot-password",{email:forgotEmail.trim()});setForgotMessage(r.data.message)}catch(e){setForgotMessage(e.response?.data?.message||"Unable to send reset link")}finally{setForgotLoading(false)}}}>{forgotLoading?"Sending...":"Send reset link"}</button>
                <button type="button" className="secondary-button" onClick={()=>setShowForgot(false)}>Close</button>
              </div>
            </div>
          )}

          {/* SIGNUP */}

          <div className="auth-switch">
            <span>Don't have an account?</span>

            <Link to="/signup">Create an account</Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Login;
