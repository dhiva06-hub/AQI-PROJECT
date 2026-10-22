const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const http = require('http');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { connectDB, closeDB } = require('./config/db');
const { initSocket } = require('./sockets/socket');
const { scheduleAqiUpdater, runIngestionPass } = require('./jobs/aqiUpdater');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const airQualityRoutes = require('./routes/airQualityRoutes');
const stationRoutes = require('./routes/stationRoutes');
const authRoutes = require('./routes/authRoutes');
const alertRoutes = require('./routes/alertRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
// Allow the configured origin plus localhost / 127.0.0.1 on any port (Vite may pick 5174, 5175 ...)
const ALLOWED_ORIGINS = [FRONTEND_ORIGIN, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];

app.use(cors({ origin: ALLOWED_ORIGINS }));

// Log slow requests so timeouts can be traced to an endpoint
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - t0;
    if (ms > 2000) console.warn(`[slow] ${req.method} ${req.originalUrl} took ${ms}ms`);
  });
  next();
});
app.use(express.json());

// Rate limit public API endpoints to protect against abuse.
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', publicLimiter);

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Real-Time AQI Aggregator API', docs: '/README.md' });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Real-Time AQI Aggregator API',
    endpoints: [
      '/api/air-quality/current',
      '/api/air-quality/available-cities',
      '/api/stations',
      '/api/alerts',
      '/api/admin/health',
    ],
  });
});

app.use('/api', airQualityRoutes);
app.use('/api', stationRoutes);
app.use('/api', authRoutes);
app.use('/api', alertRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const httpServer = http.createServer(app);
initSocket(httpServer, ALLOWED_ORIGINS);

async function start() {
  try {
    // 1. Await database connection before attempting dependent operations
    console.log('[server] Initializing MongoDB connection...');
    await connectDB();
  } catch (err) {
    console.error(`[server] Critical: MongoDB connection failure during startup: ${err.message}`);
    // We do NOT silently fall back to fake in-memory data
  }

  // 2. Start HTTP server
  httpServer.listen(PORT, () => {
    console.log(`[server] listening on port ${PORT} (env: ${process.env.NODE_ENV || 'development'})`);
  });

  // 3. Start scheduler and trigger initial real ingestion pass
  scheduleAqiUpdater();
  runIngestionPass().catch((err) => console.error('[server] Initial ingestion pass error:', err.message));
}

// Graceful shutdown handling
const handleShutdown = async (signal) => {
  console.log(`\n[server] ${signal} signal received: closing HTTP server and database connection...`);
  httpServer.close(async () => {
    console.log('[server] HTTP server closed.');
    await closeDB();
    process.exit(0);
  });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

start();

module.exports = { app, httpServer };
