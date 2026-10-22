const Station = require('../models/Station');
const Measurement = require('../models/Measurement');
const { ApiError } = require('../middleware/errorHandler');
const { getIngestionStatus } = require('../jobs/aqiUpdater');
const { isConnected } = require('../config/db');
const memoryStore = require('../services/inMemoryStore');
const { hasApiKey } = require('../services/externalAPIService');

const CACHE_TTL_MS = 45 * 1000;
let stationsCache = { data: null, cachedAt: 0 };
let stationsInFlight = null;

/**
 * GET /api/stations
 */
async function listStations(req, res, next) {
  try {
    if (!isConnected()) {
      const stations = memoryStore.getStations();
      return res.json({ success: true, count: stations.length, data: stations });
    }

    const now = Date.now();
    if (stationsCache.data && now - stationsCache.cachedAt < CACHE_TTL_MS) {
      return res.json({
        success: true,
        count: stationsCache.data.length,
        data: stationsCache.data,
      });
    }

    if (!stationsInFlight) {
      stationsInFlight = (async () => {
        const stations = await Station.find().select('-sensors').sort({ country: 1, name: 1 }).lean();
        stationsCache = {
          data: stations,
          cachedAt: Date.now(),
        };
        return stations;
      })().finally(() => {
        stationsInFlight = null;
      });
    }

    const stations = await stationsInFlight;
    res.json({ success: true, count: stations.length, data: stations });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/stations/:id
 * :id may be the Mongo _id or the human-readable stationId.
 */
async function getStation(req, res, next) {
  try {
    const { id } = req.params;

    if (!isConnected()) {
      const station = memoryStore.getStation(id);
      if (!station) throw new ApiError(404, `Station "${id}" not found`);
      const latest = memoryStore.getLatestMeasurement(station.stationId);
      return res.json({ success: true, data: { station, latest: latest || null } });
    }

    const station =
      (await Station.findOne({ stationId: id }).lean()) ||
      (id.match(/^[0-9a-fA-F]{24}$/) ? await Station.findById(id).lean() : null);

    if (!station) throw new ApiError(404, `Station "${id}" not found`);

    const latest =
      (await Measurement.findOne({ stationId: station.stationId })
        .sort({ sourceTimestamp: -1 })
        .lean()) ||
      station.latest ||
      null;

    res.json({ success: true, data: { station, latest } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/health
 */
async function getHealth(req, res, next) {
  try {
    const stationCount = isConnected()
      ? await Station.countDocuments()
      : (process.env.NODE_ENV === 'test' ? memoryStore.getStations().length : 0);

    res.json({
      success: true,
      data: {
        dbConnected: isConnected(),
        dataSource: 'openaq',
        openaqKeyConfigured: hasApiKey(),
        storageMode: isConnected() ? 'mongodb-atlas' : (process.env.NODE_ENV === 'test' ? 'in-memory-standalone' : 'disconnected'),
        stationCount,
        ingestion: getIngestionStatus(),
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listStations, getStation, getHealth };
