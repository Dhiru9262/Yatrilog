import { useState } from "react";
import { COMPANY_NAME } from "../../config/appConfig";
import { Link, useNavigate } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";

import api from "../../api/axios";

const Signup = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

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
  // SIGNUP
  // ======================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const { name, email, phone, password, confirmPassword } = formData;

    // ==================================
    // VALIDATION
    // ==================================

    if (!name || !email || !phone || !password || !confirmPassword) {
      setError("Please fill in all required fields.");

      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");

      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");

      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/register", {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });

      setSuccess(response.data.message || "Account created. Check your email for the verification code.");

      setTimeout(() => {
        navigate(`/verify-email?email=${encodeURIComponent(email.trim())}`, { replace: true });
      }, 700);
    } catch (error) {
      console.error("Signup error:", error);

      setError(error.response?.data?.message || "Unable to create account.");
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
              Your journey
              <br />
              starts here.
            </h1>

            <p>Create your account and discover a simpler way to travel.</p>
          </div>

          <div className="auth-brand-decoration">
            <span>✦</span>
            <span>✦</span>
            <span>✦</span>
          </div>
        </div>

        {/* ==================================
            SIGNUP FORM
            ================================== */}

        <div className="auth-form-panel">
          <div className="auth-form-header">
            <p className="eyebrow">GET STARTED</p>

            <h2>Create account</h2>

            <p>{`Join ${COMPANY_NAME} and start booking your journeys.`}</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          {success && <div className="auth-success">{success}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            {/* NAME */}

            <div className="auth-field">
              <label htmlFor="name">Full name</label>

              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Your full name"
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

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

            {/* PHONE */}

            <div className="auth-field">
              <label htmlFor="phone">Phone number</label>

              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            {/* PASSWORD */}

            <div className="auth-field">
              <label htmlFor="password">Password</label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            {/* CONFIRM PASSWORD */}

            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm password</label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            {/* SUBMIT */}

            <button
              type="submit"
              className="primary-button auth-submit"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}

              {!loading && <span>→</span>}
            </button>
          </form>

          {/* LOGIN */}

          <div className="auth-switch">
            <span>Already have an account?</span>

            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Signup;
