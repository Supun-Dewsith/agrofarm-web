# AgroFarm Management System — Web Portal

[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg?logo=react)](https://react.dev/)
[![React Router](https://img.shields.io/badge/React%20Router-v7-CA4245.svg?logo=react-router)](https://reactrouter.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-06B6D4.svg?logo=tailwindcss)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Wrangler-F38020.svg?logo=cloudflare)](https://developers.cloudflare.com/pages/)
[![i18next](https://img.shields.io/badge/i18n-Multi--Language-26A69A.svg?logo=i18next)](https://www.i18next.com/)

A modern, responsive, high-performance web dashboard for the **Agro-Trade Farming Management System**. Built with React 19, React Router v7 SPA architecture, Tailwind CSS, Leaflet GIS mapping, and Recharts analytics.

---

## Table of Contents
- [Overview](#overview)
- [Key Features & Modules](#key-features--modules)
- [System Architecture & Authentication Flow](#system-architecture--authentication-flow)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Environment Configuration](#environment-configuration)
- [Installation & Setup](#installation--setup)
- [Available Scripts](#available-scripts)
- [Multi-Language Localization (i18n)](#multi-language-localization-i18n)
- [Deployment (Cloudflare Pages)](#deployment-cloudflare-pages)
- [Code Style & Contributing](#code-style--contributing)

---

## Overview

The AgroFarm Web Portal gives farm managers, supervisors, and administrators complete control over agricultural operations:
- Monitor multi-farm performance and financial health in real time.
- Direct labor assignments and track attendance through dynamic QR codes.
- Map farm geofences and plot boundaries interactively.
- Leverage computer vision to diagnose crop diseases and formulate remediation plans.
- Compare harvested yields with official government commodity prices.

---

## Key Features & Modules

### 1. Executive Dashboard (`/home/dashboard`)
- Real-time KPI summaries: Total Farms, Active Workers, Total Crops, Yield Targets, and Financial Margin.
- Interactive **Farm Weather Slideshow** featuring satellite telemetry for each farm plot.
- Financial overview charts displaying income vs. operational expenditure over time.
- Quick navigation shortcuts to mission-critical operations.

### 2. Workers Management (`/home/farmers`)
- Directory of all registered farm laborers, field operators, and agronomists.
- Filter workers by farm location or search by name and contact details.
- View assigned tasks, active statuses, and assigned plot history.
- Quick access to add new personnel via the User Registration wizard.

### 3. Farm & Plot GIS Mapping (`/home/farm-management`)
- Interactive geospatial map powered by **Leaflet** / **React-Leaflet**.
- Draw and manage farm boundaries with custom GPS polygon coordinates.
- Sub-divide farms into distinct fields with acreage, soil type, and crop status.
- Search farm locations globally using geocoded search.

### 4. Crop Management (`/home/crops`)
- Cultivation lifecycle tracking from seeding to harvest readiness.
- Record crop varieties, expected harvest dates, and targeted vs. actual yields.
- Filter and search crops by field or developmental stage.

### 5. Smart Attendance System (`/home/attendance`)
- **Dynamic QR Code Generation**: Generates secure, auto-refreshing QR codes displayed in farm facilities for workers to scan.
- Daily check-in/check-out ledger with GPS accuracy and proximity verification.
- Real-time headcount of workers currently on-site.

### 6. Task Management (`/home/tasks`)
- Create and assign agricultural tasks (e.g. Irrigation, Pest Control, Pruning, Harvesting).
- Prioritize tasks (**Low**, **Medium**, **High**, **Urgent**) and set due dates.
- Assign tasks to specific supervisors and field workers.
- Track workflow progress (**Pending**, **In Progress**, **Completed**).

### 7. AI Plant Pathology & Disease Detection (`/home/disease-detection`)
- Upload plant leaf imagery for instant neural diagnosis.
- Comprehensive disease reports: Pathogen classification, scientific name, severity level, and probability distribution.
- **Integrated Pest Management (IPM) Matrix**: Chemical, biological, and organic treatment strategies.
- Convert diagnostic findings directly into remediation tasks assigned to workers.

### 8. Inventory Management (`/home/inventory`)
- Track agricultural resources: Seeds, fertilizers, pesticides, tools, and heavy machinery.
- Minimum threshold triggers to alert supervisors when stock requires replenishment.
- Historical consumption tracking tied to specific tasks and fields.

### 9. Harvest & Official Market Intelligence (`/home/harvest`)
- Log harvested yields (kg/tons) and quality ratings.
- Comparison against official commodity market prices to estimate profits.
- Market trend tracking to time crop distribution for optimal margins.

### 10. Weather Forecasting (`/home/weather`)
- Precise coordinates-based weather conditions for each registered farm.
- 5-day forecasts, precipitation probability, humidity, and wind speed.
- Smart agricultural warnings (e.g. frost, heavy rain, dry spells) for field protection.

### 11. Reports & Analytics (`/home/reports`)
- Comprehensive exportable farm analytics and financial reports.
- Yield efficiency metrics per field, labor productivity reports, and resource audit trails.

### 12. Settings & Access Management (`/home/settings`, `/home/register-users`)
- Role-based permissions matrix: Admin, Supervisor, and Worker tiers.
- Profile personalization, security credentials, and farm assignment management.
- Multi-language switcher supporting **English**, **Sinhala (සිංහල)**, and **Tamil (தமிழ்)**.

---

## System Architecture & Authentication Flow

```
                      [ User Browser / Web Client ]
                                   │
                                   ▼
                       [ React Router v7 SPA ]
                                   │
                   ┌───────────────┴───────────────┐
                   ▼                               ▼
          [ clientLoader ]                 [ fetchWithAuth ]
       Reads user profile & token          Wraps all API requests
        from localStorage instantly          with auto-refresh logic
                   │                               │
                   │                               ▼
                   │                  Authorization: Bearer <Token>
                   │                               │
                   ▼                               ▼
         [ Protected Route ]             [ Spring Boot Backend ]
```

### Automatic Token Refresh Workflow
All authenticated network calls utilize `fetchWithAuth(url, options)` from [app/utils/auth.ts](file:///c:/filejava/springBoot/agro-trade-farming-management-system/agrofarm-web/agrofarm-web/app/utils/auth.ts):

1. **Resolution**: Resolves relative endpoints (e.g. `/api/crops`) against `VITE_API_BASE_URL`.
2. **Injection**: Retrieves `accessToken` from `localStorage` and appends `Authorization: Bearer <token>`.
3. **Execution**: Dispatches request to the backend API.
4. **Interception**: If the response returns `401 Unauthorized`, `fetchWithAuth` automatically attempts to call `/api/auth/refresh` using the stored `refreshToken`.
5. **Recovery**: If refresh succeeds, the new token is saved and the original request is transparently re-attempted. If refresh fails, tokens are purged and the user is redirected to `/login`.

---

## Tech Stack

- **Framework:** React 19, React Router v7 (SPA Mode)
- **Language:** TypeScript 5.9
- **Bundler & Tooling:** Vite 8.0, `@cloudflare/vite-plugin`
- **Styling:** Tailwind CSS v4, Vanilla CSS Design Tokens
- **Icons:** Lucide React
- **Data Visualization:** Recharts
- **Mapping & GIS:** Leaflet, React-Leaflet
- **QR Generation:** QRCode
- **Internationalization:** i18next, react-i18next, i18next-http-backend
- **Cloud Platform:** Cloudflare Pages (Wrangler CLI)

---

## Prerequisites

Ensure your development environment has:
- [Node.js](https://nodejs.org/) (Version **20.x** or **22.x** LTS recommended)
- `npm` (v10 or higher)

---

## Project Structure

```
agrofarm-web/
├── app/
│   ├── components/            # Reusable UI & Widget components
│   │   ├── dashboard/         # Dashboard charts & Weather slideshow
│   │   ├── DiseaseAskMoreChat.tsx # Disease AI interactive assistant
│   │   ├── ImageBoundingBox.tsx   # Leaf lesion bounding box viewer
│   │   ├── LanguageSwitcher.tsx   # Language selection dropdown
│   │   └── NotificationBell.tsx   # Notification drawer
│   ├── routes/                # Application page routes
│   │   ├── attendance.tsx     # Attendance & QR scanner page
│   │   ├── crops.tsx          # Crop inventory & lifecycle
│   │   ├── dashboard.tsx      # Main executive dashboard
│   │   ├── disease-detection.tsx # AI plant diagnosis
│   │   ├── farm-management.tsx# GIS mapping & boundary editor
│   │   ├── farmers.tsx        # Workers management directory
│   │   ├── harvest.tsx        # Harvest logs & market rates
│   │   ├── inventory.tsx      # Resource & supply tracking
│   │   ├── reports.tsx        # Analytics & reports export
│   │   ├── settings.tsx       # System preferences & profile
│   │   ├── tasks.tsx          # Task assignments & scheduling
│   │   ├── user-registration.tsx # Staff registration wizard
│   │   └── weather.tsx        # Meteorological forecasting
│   ├── services/              # API Client services (disease, weather, etc.)
│   ├── types/                 # Shared TypeScript interfaces & types
│   ├── utils/                 # Utilities (auth, permissions, constants)
│   ├── layout.tsx             # Responsive layout with sidebar & topbar
│   ├── routes.ts              # Route declarations
│   └── root.tsx               # Root application entry point
├── public/
│   ├── locales/               # Localization dictionaries (en, si, ta)
│   │   ├── en.json            # English translations
│   │   ├── si.json            # Sinhala translations
│   │   └── ta.json            # Tamil translations
│   └── logo.png               # Application branding
├── wrangler.jsonc             # Cloudflare Pages deployment configuration
├── vite.config.ts             # Vite build & plugin configurations
└── package.json               # Dependencies & scripts
```

---

## Environment Configuration

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Define the backend API origin:

```env
# Backend Base URL (Spring Boot API origin)
VITE_API_BASE_URL="http://localhost:8080"
```

> **Note:** If running through the local Nginx proxy on port 80, set `VITE_API_BASE_URL="http://localhost"`. When running backend directly via Maven, use `VITE_API_BASE_URL="http://localhost:8080"`.

---

## Installation & Setup

> **Important:** Always use `npm ci` rather than `npm install` to ensure lockfile integrity across all machines.

```bash
# 1. Install exact dependencies
npm ci

# 2. Start local development server with Hot Module Replacement
npm run dev
```

The application will be accessible at:
`http://localhost:5173`

---

## Available Scripts

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `npm run dev` | Starts local dev server at `http://localhost:5173` |
| `typecheck` | `npm run typecheck` | Generates Cloudflare types & runs strict TypeScript checks |
| `build` | `npm run build` | Compiles production assets into `build/client` |
| `preview` | `npm run preview` | Previews the compiled production bundle locally |
| `deploy` | `npm run deploy` | Builds and deploys directly to Cloudflare Pages |
| `translate:scan` | `npm run translate:scan` | Scans code for `t(...)` keys and updates locale files |

---

## Multi-Language Localization (i18n)

The web portal includes full localization in 3 languages:
- **English** (`en`)
- **Sinhala** (`si`)
- **Tamil** (`ta`)

### How to use translations in components:
```tsx
import { useTranslation } from "react-i18next";

export function ExampleComponent() {
  const { t } = useTranslation();
  return <h1>{t("Worker Management")}</h1>;
}
```

### Adding new translation keys:
1. Wrap user-facing strings with `{t("Your String")}`.
2. Run the translation scanner to extract keys:
   ```bash
   npm run translate:scan
   ```
3. Add the corresponding Sinhala and Tamil phrases in `public/locales/si.json` and `public/locales/ta.json`. Alternatively, run `node autoTranslate.js` for automated batch translation.

---

## Deployment (Cloudflare Pages)

The project is optimized for deployment on **Cloudflare Pages** using the Wrangler CLI.

### Deploy to Production
```bash
# Authenticate with Cloudflare (first time only)
npx wrangler login

# Build and deploy
npm run deploy
```

### Deploy a Preview Branch
```bash
npx wrangler versions upload
```

---

## Code Style & Contributing

1. **Strict Type Safety**: Always ensure TypeScript compiles cleanly with `npm run typecheck` before pushing.
2. **Atomic Commits**: Follow Conventional Commits:
   - `feat(workers): add filter by farm plot`
   - `fix(attendance): resolve GPS radius validation error`
   - `style(dashboard): polish dark mode card contrast`
3. **Responsive Design**: Ensure all pages render gracefully on mobile displays (375px+) as well as widescreen monitors.

---

## License
This project is proprietary and confidential. Developed for the Agro-Trade Farming Management System.
