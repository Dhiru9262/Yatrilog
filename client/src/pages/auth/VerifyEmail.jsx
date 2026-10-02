import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const inputRefs = useRef([]);
  const [email, setEmail] = useState(params.get("email") || "");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!email) return;
    inputRefs.current[0]?.focus();
  }, [email]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setError("");

    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = pasted.split("");
    while (next.length < 6) next.push("");
    setOtp(next);
    inputRefs.current[Math.min(pasted.length, 6) - 1]?.focus();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const code = otp.join("");

    if (!email.trim()) return setError("Please enter your email address.");
    if (!/^\d{6}$/.test(code)) return setError("Please enter the complete 6-digit verification code.");

    try {
      setLoading(true);
      const response = await api.post("/auth/verify-email", { email: email.trim(), otp: code });
      setVerified(true);
      setMessage(response.data.message);
      window.setTimeout(() => navigate("/login", { replace: true }), 1400);
    } catch (error) {
      setError(error.response?.data?.message || "Unable to verify your email.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email.trim() || cooldown > 0) return;
    setError("");
    setMessage("");
    try {
      setResending(true);
      const response = await api.post("/auth/resend-verification", { email: email.trim() });
      setMessage(response.data.message);
      setCooldown(45);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (error) {
      setError(error.response?.data?.message || "Unable to resend the code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-container auth-container-single">
        <div className="auth-form-panel auth-verification-panel">
          <div className="auth-icon-badge">✉</div>
          <div className="auth-form-header">
            <p className="eyebrow">EMAIL VERIFICATION</p>
            <h2>{verified ? "Email verified" : "Check your inbox"}</h2>
            <p>
              {verified
                ? "Your account is ready. Taking you to the login page..."
                : "We sent a 6-digit verification code to your email address."}
            </p>
          </div>

          {!verified && (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="verifyEmail">Email address</label>
                <input
                  id="verifyEmail"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setError(""); }}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="auth-field">
                <div className="auth-label-row">
                  <label>Verification code</label>
                  <span className="otp-hint">6 digits</span>
                </div>
                <div className="otp-inputs" onPaste={handlePaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => { inputRefs.current[index] = element; }}
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(event) => handleOtpChange(index, event.target.value)}
                      onKeyDown={(event) => handleKeyDown(index, event)}
                      aria-label={`Verification digit ${index + 1}`}
                      disabled={loading}
                    />
                  ))}
                </div>
              </div>

              {error && <div className="auth-error">{error}</div>}
              {message && <div className="auth-success">{message}</div>}

              <button type="submit" className="primary-button auth-submit" disabled={loading}>
                {loading ? "Verifying..." : "Verify email"}
                {!loading && <span>→</span>}
              </button>
            </form>
          )}

          {!verified && (
            <div className="auth-resend">
              <span>Didn't receive the code?</span>
              <button type="button" onClick={resend} disabled={resending || cooldown > 0}>
                {resending ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          )}

          <Link className="auth-back-link" to="/login">← Back to login</Link>
        </div>
      </section>
    </main>
  );
}
