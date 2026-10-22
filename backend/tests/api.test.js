/**
 * Lightweight REST endpoint tests using Supertest.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

const express = require('express');
const cors = require('cors');
const request = require('supertest');

const airQualityRoutes = require('../routes/airQualityRoutes');
const stationRoutes = require('../routes/stationRoutes');
const authRoutes = require('../routes/authRoutes');
const alertRoutes = require('../routes/alertRoutes');
const { notFoundHandler, errorHandler } = require('../middleware/errorHandler');
const memoryStore = require('../services/inMemoryStore');

// Fixture data - the API tests never call OpenAQ.
const FIXTURE_STATIONS = [
  { stationId: 'openaq-1', name: 'Test Station A', city: 'Chennai', state: '', country: 'India', countryCode: 'IN', latitude: 13.1, longitude: 80.2, source: 'openaq', externalUid: '1', sensors: [], status: 'active' },
  { stationId: 'openaq-2', name: 'Test Station B', city: 'Boston', state: '', country: 'United States', countryCode: 'US', latitude: 42.3, longitude: 77.2, source: 'openaq', externalUid: '2', sensors: [], status: 'active' },
];
memoryStore.setStations(FIXTURE_STATIONS);
FIXTURE_STATIONS.forEach((st) =>
  memoryStore.addMeasurement({ stationId: st.stationId, aqi: 80, category: 'Satisfactory', level: 2, standard: 'CPCB', pm25: 40, pm10: 70, no2: null, so2: null, co: null, o3: null, source: 'openaq', sourceTimestamp: new Date() })
);

function buildApp() {
  const app = express();
  app.use(cors({ origin: process.env.FRONTEND_ORIGIN }));
  app.use(express.json());
  app.get('/', (req, res) => res.json({ success: true, message: 'Real-Time AQI Aggregator API' }));
  app.get('/api', (req, res) => res.json({ success: true, message: 'Real-Time AQI Aggregator API', endpoints: ['/api/alerts'] }));
  app.use('/api', airQualityRoutes);
  app.use('/api', stationRoutes);
  app.use('/api', authRoutes);
  app.use('/api', alertRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe('REST API', () => {
  const app = buildApp();

  test('GET / returns a welcome payload', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api returns base api info', async () => {
    const res = await request(app).get('/api');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/alerts returns valid array response', async () => {
    const res = await request(app).get('/api/alerts');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/stations returns the stations', async () => {
    const res = await request(app).get('/api/stations');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].source).toBe('openaq');
  });

  test('GET /api/air-quality/current returns station readings structure', async () => {
    const res = await request(app).get('/api/air-quality/current');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].station).toBeDefined();
  });

  test('GET /api/history/openaq-1 returns historical data', async () => {
    const res = await request(app).get('/api/history/openaq-1?range=24h');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/history/:stationId rejects an invalid range', async () => {
    const res = await request(app).get('/api/history/openaq-1?range=bogus');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Invalid range/i);
  });

  test('POST /api/auth/register creates a new user and returns token', async () => {
    const email = `test_${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email,
      password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();

    // Login test
    const loginRes = await request(app).post('/api/auth/login').send({
      email,
      password: 'password123',
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.token).toBeDefined();
  });

  test('POST /api/auth/register rejects missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/admin/health returns operational status', async () => {
    const res = await request(app).get('/api/admin/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stationCount).toBe(2);
  });

  test('Unknown route returns 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});
