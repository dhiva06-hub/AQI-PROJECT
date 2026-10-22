const bcrypt = require('bcryptjs');
const { emitAqiUpdate } = require('../sockets/socket');
const { fetchStationReading, discoverStations, hasApiKey } = require('./externalAPIService');

class InMemoryStore {
  constructor() {
    this.stations = [];
    this.measurements = [];
    this.users = new Map();
    this.seedDemoUser();
    if (process.env.NODE_ENV !== 'test') {
      this.initRealData();
    }
  }

  async seedDemoUser() {
    try {
      await this.createUser({
        name: 'Demo User',
        email: 'demo@example.com',
        password: 'password123',
      });
    } catch (_) {
      // ignore
    }
  }

  /** Discovers real OpenAQ stations (used when MongoDB is not connected). */
  async loadStations() {
    if (!hasApiKey()) {
      console.error('[inMemoryStore] OPENAQ_API_KEY missing - no stations loaded. Add it to backend/.env');
      return;
    }
    // Share one in-flight discovery so startup + first cron pass do not both call OpenAQ.
    if (!this._loading) {
      this._loading = discoverStations()
        .then((list) => {
          this.stations = list;
          console.log(`[inMemoryStore] Loaded ${list.length} OpenAQ stations.`);
        })
        .finally(() => {
          this._loading = null;
        });
    }
    return this._loading;
  }

  /** Replaces the station list (used by tests). */
  setStations(list) {
    this.stations = [...list];
  }

  initBaselineData() {
    // Strictly per requirements: no mock data, random readings, or fake AQI values are generated.
    console.warn('[inMemoryStore] Mock baseline data generation disabled to strictly enforce real data pipeline.');
  }

  async initRealData() {
    try {
      if (!hasApiKey()) {
        console.warn('[inMemoryStore] No OPENAQ_API_KEY set.');
        return;
      }
      await this.loadStations();
      console.log(`[inMemoryStore] Requesting live OpenAQ data for ${this.stations.length} stations...`);
      for (const st of this.stations) {
        const curr = await fetchStationReading(st);
        if (curr) {
          this.measurements.push(curr);
          emitAqiUpdate(curr);
        }
      }
      console.log(`[inMemoryStore] Real-time OpenAQ pass complete: ${this.measurements.length} live readings available.`);
    } catch (err) {
      console.warn('[inMemoryStore] OpenAQ data ingestion pass encountered error:', err.message);
    }
  }

  getStations() {
    return [...this.stations];
  }

  getStation(id) {
    return this.stations.find((s) => s.stationId === id || s._id === id) || null;
  }

  getLatestMeasurement(stationId) {
    const list = this.measurements
      .filter((m) => m.stationId === stationId && new Date(m.sourceTimestamp).getTime() <= Date.now())
      .sort((a, b) => new Date(a.sourceTimestamp).getTime() - new Date(b.sourceTimestamp).getTime());
    if (!list.length) return null;
    return list[list.length - 1];
  }

  getCurrentAll() {
    return this.stations.map((station) => ({
      station,
      latest: this.getLatestMeasurement(station.stationId),
    }));
  }

  getCurrentByCity(city) {
    const regex = new RegExp(`^${city.trim()}$`, 'i');
    const matched = this.stations.filter((s) => regex.test(s.city));
    return matched.map((station) => ({
      station,
      latest: this.getLatestMeasurement(station.stationId),
    }));
  }

  getHistory(stationId, sinceDate) {
    return this.measurements
      .filter((m) => m.stationId === stationId && new Date(m.sourceTimestamp) >= sinceDate)
      .sort((a, b) => new Date(a.sourceTimestamp) - new Date(b.sourceTimestamp));
  }

  addMeasurement(reading) {
    if (!reading) return null;
    this.measurements.push(reading);
    if (this.measurements.length > 5000) {
      this.measurements.splice(0, this.measurements.length - 5000);
    }
    return reading;
  }

  async findUserByEmail(email) {
    return this.users.get(email.toLowerCase()) || null;
  }

  async createUser({ name, email, password }) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const user = {
      _id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'user',
      comparePassword: async function (candidate) {
        return bcrypt.compare(candidate, this.passwordHash);
      },
    };
    this.users.set(email.toLowerCase(), user);
    return user;
  }
}

const memoryStore = new InMemoryStore();
module.exports = memoryStore;
