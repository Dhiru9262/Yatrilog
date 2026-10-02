# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
## Environment configuration

Create `client/.env` from `client/.env.example` and configure the application branding and API endpoints:

```env
VITE_COMPANY_NAME=Yatrilog.com
VITE_COMPANY_EMAIL=your-company-email@example.com
VITE_SUPPORT_EMAIL=your-support-email@example.com
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

The frontend reads the company name and company/support email from environment variables instead of hardcoding company branding into UI components.

**Backend note:** this uploaded project contains only the `client` application; no backend/server source code is present in the ZIP. To apply the same environment-driven branding to backend emails, templates, responses, and configuration, the backend source must be provided as well.

