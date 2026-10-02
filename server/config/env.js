const requiredEnv = [
  "MONGO_URI",
  "JWT_SECRET",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "COMPANY_NAME",
  "COMPANY_EMAIL",
];

const validateEnv = () => {
  const missing = requiredEnv.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );

    process.exit(1);
  }

  console.log("Environment configuration validated");
};

const APP_CONFIG = Object.freeze({
  companyName: process.env.COMPANY_NAME || "",
  companyEmail: process.env.COMPANY_EMAIL || "",
  supportEmail: process.env.SUPPORT_EMAIL || process.env.COMPANY_EMAIL || "",
});

module.exports = {
  validateEnv,
  APP_CONFIG,
};
