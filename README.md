# Yatrilog.com

Complete full-stack project containing both the React/Vite client and Node/Express server.

## Structure

- `client/` — React frontend, Hindi/English toggle, transparent Yatrilog.com branding, responsive UI.
- `server/` — Node/Express backend, APIs, authentication, booking, payment, email, sockets, and database integration.

## Environment configuration

Company branding is environment-driven in both applications.

### Client
Copy/edit `client/.env` or use `client/.env.example`:

- `VITE_COMPANY_NAME`
- `VITE_COMPANY_EMAIL`
- `VITE_SUPPORT_EMAIL`

### Server
Use `server/.env.example` as the template. Set:

- `COMPANY_NAME`
- `COMPANY_EMAIL`
- `SUPPORT_EMAIL`
- database, JWT, Razorpay, SMTP, and frontend URL values

Do not commit real secrets.
