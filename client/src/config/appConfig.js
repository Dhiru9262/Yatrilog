const env = import.meta.env;

export const APP_CONFIG = Object.freeze({
  companyName: env.VITE_COMPANY_NAME || "Application",
  companyEmail: env.VITE_COMPANY_EMAIL || "",
  supportEmail: env.VITE_SUPPORT_EMAIL || env.VITE_COMPANY_EMAIL || "",
});

export const COMPANY_NAME = APP_CONFIG.companyName;
export const COMPANY_EMAIL = APP_CONFIG.companyEmail;
export const SUPPORT_EMAIL = APP_CONFIG.supportEmail;
