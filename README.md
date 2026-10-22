# Real-Time Air Quality Index (AQI) Aggregator & Mapping System

A production full-stack MERN application that aggregates, processes, normalizes, and visualizes real-time air quality data using the **OpenAQ v3 API** - covering monitoring stations all over the world and **Leaflet + OpenStreetMap**.

---

## 🌟 Main Project Features

1. **Real-Time AQI Aggregation**: Automated backend polling via `node-cron` querying the OpenAQ v3 API (free API key required).
2. **100% Real Environmental Data**: Strictly uses real OpenAQ station measurements. Zero simulated or fake fallback data.
3. **AQI Calculation**: OpenAQ provides raw concentrations, not an AQI. The backend converts units, computes a sub-index for each pollutant (PM2.5, PM10, NO2, SO2, CO, O3) and sets the AQI to the highest sub-index (the dominant pollutant). Stations in **India use the Indian CPCB AQI**; every other country uses the **US EPA AQI**.
4. **Geospatial Station Mapping**: Interactive Leaflet map utilizing standard **OpenStreetMap** tiles with real GPS coordinates and auto-fitting bounds.
5. **Real-Time WebSockets**: Live telemetry broadcast over `Socket.IO` to connected clients without page reloads.
6. **Historical Timeseries Telemetry**: MongoDB Atlas historical data storage and Recharts visualization.
7. **Production Developer UI**: Clean, responsive, accessible interface built with a White + Mud/Earthy Brown + Green Accent design system.
8. **Secure Authentication Flow**: JWT-based user authentication protecting system routes and station telemetry.

---

## 🏗 System Architecture

```
                       ┌────────────────────────────┐
                       │     OpenAQ (openaq.org)    │
                       │    Air-quality API v3      │
                       └─────────────┬──────────────┘
                                     │ (Live HTTP Poll, X-API-Key)
                                     ▼
 ┌───────────────┐   every 10 min   ┌──────────────────────────────┐
 │ node-cron job │ ────────────────▶│  externalAPIService.js       │
 │ (aqiUpdater)  │                  │  - Station discovery (bbox)  │
 └───────┬───────┘                  │  - Error / rate-limit logger │
         │                          └──────────────┬───────────────┘
         │                                         │
         │                          dataNormalizer.js (conc -> CPCB AQI)
         │                                         │
         ▼                                         ▼
 ┌────────────────────────────────────────────────────────┐
 │                      MongoDB Atlas                     │
 │          Station & Measurement Real Stored Models      │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
    ┌─────────────────────────────────────────────────┐
    │              Node.js + Express REST API         │
    │                   (server.js)                   │
    └──────────┬───────────────────────────┬──────────┘
               │                           │
           REST API                   Socket.IO Push
      (Endpoints / Lookup)            ("aqiUpdated")
               │                           │
               ▼                           ▼
    ┌─────────────────────────────────────────────────┐
    │               React + Vite Frontend             │
    │  - Protected Route Authentication               │
    │  - Dashboard & CPCB Radial Gauge                │
    │  - Leaflet + OpenStreetMap Station Map          │
    │  - Timeseries Historical Charts & CSV Export    │
    │  - Station Comparator & Search                  │
    └─────────────────────────────────────────────────┘
```

---

## 📁 Folder Structure

```
aqi-project/
├── frontend/
│   ├── src/
│   │   ├── components/       AQICard, PollutantCard, StationCard, AQIMap,
│   │   │                     StationMarker, AQILegend, AQIChart, SearchBar,
│   │   │                     HealthAdvisory, StationComparator, Navbar, TechStackDrawer
│   │   ├── pages/            Dashboard, MapPage, HistoryPage, StationsPage, AlertsPage, LoginPage
│   │   ├── services/api.js   Axios instance + Socket.IO client
│   │   ├── hooks/useAQI.js   Live-updating hook (WebSocket + poll fallback)
│   │   ├── App.jsx, main.jsx, index.css
│   ├── package.json, vite.config.js, .env.example
├── backend/
│   ├── controllers/          airQualityController, stationController, authController
│   ├── models/               Station, Measurement, User, Alert
│   ├── routes/               airQualityRoutes, stationRoutes, authRoutes
│   ├── services/             externalAPIService (OpenAQ v3), dataNormalizer (CPCB AQI), inMemoryStore
│   ├── jobs/aqiUpdater.js    node-cron ingestion pipeline
│   ├── sockets/socket.js     Socket.IO setup, emits "aqiUpdated"
│   ├── middleware/           errorHandler, auth
│   ├── config/db.js          MongoDB Atlas Mongoose connector
│   ├── seed/seedStations.js  Discovers + seeds real OpenAQ monitoring stations
│   ├── tests/                Jest + Supertest tests
│   ├── server.js, package.json, .env.example
├── README.md
```

---

## 🚀 Getting Started

### 1. Backend Setup

```bash
cd backend

# Configure environment variables
# Copy .env.example to .env
# Set OPENAQ_API_KEY (required), MONGODB_URI, JWT_SECRET
```

`.env` configuration:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secret_key
FRONTEND_ORIGIN=http://localhost:5173
OPENAQ_API_KEY=your_openaq_api_key      # free: https://explore.openaq.org/register
OPENAQ_COUNTRIES=                       # empty = whole world, or e.g. IN,US,GB
OPENAQ_STATIONS_PER_COUNTRY=3
OPENAQ_MAX_STATIONS=300
OPENAQ_MAX_AGE_HOURS=3
AQI_MIN_POLLUTANTS=1
AQI_STANDARD=auto                       # auto | CPCB | US_EPA
AQI_POLL_CRON=*/30 * * * *
```

Install dependencies and run:
```bash
npm install
npm run seed     # Discovers real OpenAQ stations in every country (takes a few minutes) and saves them to MongoDB
npm run dev      # Starts API server on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev      # Starts Vite dev server on http://localhost:5173
```

Visit `http://localhost:5173`. If you are not logged in, the application will direct you to the **Sign In** screen.

---

## 🧪 Testing

Run backend tests:
```bash
cd backend
npm test
```

Includes unit and integration tests for:
- CPCB AQI category mapping bands
- Unit conversion and AQI calculation (CPCB and US EPA) from raw concentrations
- OpenAQ client (worldwide station discovery, latest readings) using mocked HTTP responses
- REST API route validation, station listing, and authentication

---

## 📊 Indian CPCB National AQI Standards

| AQI Range | Category | Color | Health Advisory |
|---|---|---|---|
| 0–50 | **Good** | Green (`#16a34a`) | Minimal impact |
| 51–100 | **Satisfactory** | Amber (`#d97706`) | Minor breathing discomfort to sensitive people |
| 101–200 | **Moderate** | Orange (`#ea580c`) | Breathing discomfort to people with lung/heart disease |
| 201–300 | **Poor** | Red (`#dc2626`) | Breathing discomfort to most people on prolonged exposure |
| 301–400 | **Very Poor** | Purple (`#9333ea`) | Respiratory illness on prolonged exposure |
| 401–500 | **Severe** | Maroon (`#881337`) | Affects healthy people and seriously impacts sensitive groups |

---

## 🔬 How the AQI is calculated (worldwide)

1. `GET /v3/countries` lists the countries. For each one, `GET /v3/locations?countries_id=...` finds stations. Only fixed (non-mobile) stations that report PM2.5 or PM10 and have reported in the last 24 h are kept. Reference-grade monitors are preferred, then stations with more pollutants, and different localities are favoured. Up to `OPENAQ_STATIONS_PER_COUNTRY` per country, capped at `OPENAQ_MAX_STATIONS` overall.
2. `GET /v3/locations/{id}/latest` returns the newest value of every sensor. Readings older than `OPENAQ_MAX_AGE_HOURS` are ignored.
3. Values are converted to the units of the chosen scale, each pollutant gets a sub-index by linear interpolation over that scale's breakpoints, and **AQI = max(sub-indices)**.

| Scale | Used for | Levels |
|---|---|---|
| Indian CPCB AQI | India | Good, Satisfactory, Moderate, Poor, Very Poor, Severe |
| US EPA AQI (2024 PM2.5 breakpoints) | all other countries | Good, Moderate, Unhealthy for Sensitive Groups, Unhealthy, Very Unhealthy, Hazardous |

Both run 0–500 and have six levels, so colours and advisories work from the level. `AQI_STANDARD=CPCB` or `US_EPA` forces one scale everywhere.

**Rate limits:** a free OpenAQ key allows 60 requests/minute and 2,000/hour. Every request is paced (about 1 per second), and the refresh runs every 30 minutes (`300 stations × 2 passes/hour = 600 requests/hour`). Discovering the whole world takes a few minutes at startup (or when you run `npm run seed`). With MongoDB, seed once and later starts are instant; without it, stations are rediscovered on every start. For a quick test set `OPENAQ_COUNTRIES=IN,US,GB`.

**Notes:** the official AQI definitions use 24-hour averages (8-hour for CO and O3) and the CPCB needs at least 3 pollutants. This project uses the latest hourly readings for a real-time view, and `AQI_MIN_POLLUTANTS` (default 1, PM required) sets how many pollutants a station needs. Coverage differs a lot by country, and some countries have no usable stations. Stations with missing or stale data are skipped; nothing is simulated. Data: [OpenAQ](https://openaq.org), with each source's own licence.

---

## 🛠 Troubleshooting: "Connection Notice: timeout of 10000ms exceeded"

The browser got no answer from the backend. Check, in order:

1. The backend terminal shows `[server] listening on port 5000` (start it with `npm run dev` in `backend/`).
2. `curl http://127.0.0.1:5000/api/admin/health` returns JSON.
3. `frontend/.env` points to the same port; on Windows prefer `127.0.0.1` over `localhost`. Restart the frontend after editing `.env`.
4. MongoDB Atlas: your IP must be allowed in Network Access and the password in `MONGODB_URI` must be current. The API keeps answering while MongoDB connects and falls back to the in-memory store if it cannot.
5. The backend logs `[slow] GET /api/... took Nms` for any request slower than 2 s.
