const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendEmail } = require("../services/emailService");
const { APP_CONFIG } = require("../config/env");

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const frontendUrl = () => process.env.CLIENT_URL || "http://localhost:5173";

const generateOtp = () => String(crypto.randomInt(100000, 1000000));

const sendVerificationOtp = async (user) => {
  const otp = generateOtp();
  user.emailVerificationOtpHash = hashToken(otp);
  user.emailVerificationOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
  // Clear the older link-based verification values so only the latest OTP is valid.
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpires = null;
  await user.save();

  return sendEmail({
    to: user.email,
    subject: `Your ${APP_CONFIG.companyName} verification code`,
    html: `
      <div style="margin:0;background:#f6f7f9;padding:40px 16px;font-family:Arial,Helvetica,sans-serif;color:#172033">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e7eaf0;border-radius:20px;overflow:hidden;box-shadow:0 12px 35px rgba(23,32,51,.08)">
          <div style="background:linear-gradient(135deg,#f0442f,#ff7a28);padding:28px 32px;color:#fff">
            <div style="font-size:22px;font-weight:700;letter-spacing:-.4px">${APP_CONFIG.companyName}</div>
            <div style="margin-top:8px;font-size:13px;opacity:.88">Secure account verification</div>
          </div>
          <div style="padding:32px">
            <h2 style="margin:0 0 10px;font-size:24px">Verify your email</h2>
            <p style="margin:0;color:#687386;line-height:1.6">Use the verification code below to finish creating your ${APP_CONFIG.companyName} account.</p>
            <div style="margin:26px 0;padding:18px;text-align:center;background:#fff6f1;border:1px solid #ffd9c8;border-radius:16px">
              <div style="font-size:12px;color:#8b756b;text-transform:uppercase;letter-spacing:2px;font-weight:700">Verification code</div>
              <div style="margin-top:8px;font-size:36px;line-height:1;font-weight:800;letter-spacing:9px;color:#e8462f">${otp}</div>
            </div>
            <p style="margin:0;color:#687386;font-size:13px;line-height:1.6">This code expires in <strong>10 minutes</strong>. If you did not create this account, you can safely ignore this email.</p>
          </div>
          <div style="padding:18px 32px;background:#fafafa;border-top:1px solid #eceff3;color:#8992a1;font-size:11px">${APP_CONFIG.companyName} · Secure travel booking</div>
        </div>
      </div>
    `,
  });
};

const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      if (existingUser.role === "CUSTOMER" && !existingUser.emailVerified) {
        await sendVerificationOtp(existingUser);
        return res.status(200).json({
          success: true,
          message: "This account is not verified. A new OTP has been sent to your email.",
          email: existingUser.email,
          requiresVerification: true,
        });
      }
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password: hashedPassword,
      role: "CUSTOMER",
      emailVerified: false,
    });

    const emailSent = await sendVerificationOtp(user);

    res.status(201).json({
      success: true,
      message: emailSent
        ? "Account created. We sent a 6-digit verification code to your email."
        : "Account created, but email delivery is not configured. Please configure SMTP before verifying.",
      emailSent,
      requiresVerification: true,
      email: user.email,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { otp, email, token } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Keep backward compatibility with older verification links already sent.
    if (token) {
      const user = await User.findOne({
        email: normalizedEmail,
        emailVerificationTokenHash: hashToken(token),
        emailVerificationExpires: { $gt: new Date() },
      });
      if (!user) {
        return res.status(400).json({ success: false, message: "Verification link is invalid or expired" });
      }
      user.emailVerified = true;
      user.emailVerificationTokenHash = null;
      user.emailVerificationExpires = null;
      user.emailVerificationOtpHash = null;
      user.emailVerificationOtpExpires = null;
      await user.save();
      return res.json({ success: true, message: "Email verified successfully. You can now log in." });
    }

    if (!/^\d{6}$/.test(String(otp || ""))) {
      return res.status(400).json({ success: false, message: "Please enter the 6-digit verification code." });
    }

    const user = await User.findOne({
      email: normalizedEmail,
      emailVerificationOtpHash: hashToken(String(otp)),
      emailVerificationOtpExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification code." });
    }

    user.emailVerified = true;
    user.emailVerificationOtpHash = null;
    user.emailVerificationOtpExpires = null;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({ success: true, message: "Email verified successfully. You can now log in." });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const resendVerification = async (req, res) => {
  try {
    const normalizedEmail = String(req.body.email || "").trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(200).json({ success: true, message: "If the account exists, a verification code has been sent." });
    }
    if (user.emailVerified) {
      return res.status(400).json({ success: false, message: "Email is already verified" });
    }

    const emailSent = await sendVerificationOtp(user);
    res.json({
      success: true,
      emailSent,
      message: emailSent ? "A new verification code has been sent." : "SMTP is not configured, so the verification email could not be sent.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: String(req.body.email || "").toLowerCase() });
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      user.passwordResetTokenHash = hashToken(token);
      user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();
      const link = `${frontendUrl()}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
      await sendEmail({
        to: user.email,
        subject: `Reset your ${APP_CONFIG.companyName} password`,
        html: `<h2>Password reset</h2><p><a href="${link}">Reset password</a></p><p>This link expires in 30 minutes.</p>`,
      });
    }
    res.json({ success: true, message: "If the email exists, a password reset link has been sent." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, email, password } = req.body;
    if (!token || !email || !password || password.length < 6) {
      return res.status(400).json({ success: false, message: "Valid email, token and password of at least 6 characters are required" });
    }
    const user = await User.findOne({
      email: String(email).toLowerCase(),
      passwordResetTokenHash: hashToken(token),
      passwordResetExpires: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ success: false, message: "Reset link is invalid or expired" });
    user.password = await bcrypt.hash(password, 10);
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;
    await user.save();
    res.json({ success: true, message: "Password reset successfully. You can now log in." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required" });
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) return res.status(401).json({ success: false, message: "Invalid email or password" });
    if (user.status === "BLOCKED") return res.status(403).json({ success: false, message: "Your account is blocked" });
    if (user.role === "CUSTOMER" && !user.emailVerified) return res.status(403).json({ success: false, message: "Please verify your email before logging in", code: "EMAIL_NOT_VERIFIED" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ success: false, message: "Invalid email or password" });
    const jwtToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ success: true, message: "Login successful", token: jwtToken, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, emailVerified: user.emailVerified } });
  } catch (e) {
    console.error("Login error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -emailVerificationTokenHash -emailVerificationOtpHash -passwordResetTokenHash");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { register, login, getMe, verifyEmail, resendVerification, forgotPassword, resetPassword };
