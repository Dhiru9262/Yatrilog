import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";

const initialForm = { name: "", email: "", phone: "", password: "", confirmPassword: "" };

const AddOwner = () => {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password) {
      setError("Please complete all required fields.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/owner-management/owners", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
      });
      setSuccess(response.data.message || "Owner account created successfully.");
      setForm(initialForm);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create the owner account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-container">
      <div className="page-heading">
        <p className="eyebrow">ADMIN PORTAL</p>
        <h1>Add a New Owner</h1>
        <p>Create an owner account and provide access to the owner workspace.</p>
      </div>

      <section className="card" style={{ maxWidth: 760, margin: "0 auto", padding: "clamp(20px, 4vw, 36px)" }}>
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">OWNER DETAILS</p>
            <h2>New owner account</h2>
          </div>
          <Link to="/admin" className="text-link">Back to dashboard</Link>
        </div>

        {error && <div className="error-message" role="alert">{error}</div>}
        {success && <div className="auth-success" role="status">{success}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="owner-name">Full name</label>
            <input id="owner-name" name="name" type="text" autoComplete="name" value={form.name} onChange={handleChange} disabled={loading} required maxLength={100} />
          </div>

          <div className="auth-field">
            <label htmlFor="owner-email">Email address</label>
            <input id="owner-email" name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange} disabled={loading} required maxLength={254} />
          </div>

          <div className="auth-field">
            <label htmlFor="owner-phone">Phone number</label>
            <input id="owner-phone" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={handleChange} disabled={loading} required maxLength={20} />
          </div>

          <div className="auth-field">
            <label htmlFor="owner-password">Temporary password</label>
            <input id="owner-password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={handleChange} disabled={loading} required minLength={8} />
            <small>Use at least 8 characters and share it securely with the new owner.</small>
          </div>

          <div className="auth-field">
            <label htmlFor="owner-confirm-password">Confirm password</label>
            <input id="owner-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={handleChange} disabled={loading} required minLength={8} />
          </div>

          <button type="submit" className="primary-button auth-submit" disabled={loading}>
            {loading ? "Creating owner..." : "Create owner account"} {!loading && <span>→</span>}
          </button>
        </form>
      </section>
    </main>
  );
};

export default AddOwner;
