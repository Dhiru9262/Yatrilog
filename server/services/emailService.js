const nodemailer = require("nodemailer");
const { APP_CONFIG } = require("../config/env");

const configured = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
);

const transporter = configured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false") === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const sendEmail = async ({ to, subject, html }) => {
  if (!transporter) {
    console.warn(`SMTP is not configured. Email not sent to ${to}: ${subject}`);
    return false;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `${APP_CONFIG.companyName} <${APP_CONFIG.companyEmail}>`,
    to,
    subject,
    html,
  });

  return true;
};

module.exports = { sendEmail };
