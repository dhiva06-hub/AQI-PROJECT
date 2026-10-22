const Station = require('../models/Station');
const Measurement = require('../models/Measurement');
const { ApiError } = require('../middleware/errorHandler');
const { isConnected } = require('../config/db');
const memoryStore = require('../services/inMemoryStore');
const { searchLiveLocationAQI } = require('../services/externalAPIService');

const RANGE_TO_MS = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

/**
 * Returns latest readings from the Measurement collection for recent measurements.
 */
async function latestByStation(stationIds) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const match = { sourceTimestamp: { $gte: since } };
  if (Array.isArray(stationIds) && stationIds.length > 0 && stationIds.length < 5000) {
    match.stationId = { $in: stationIds };
  }

  const docs = await Measurement.aggregate([
    { $match: match },
    { $sort: { sourceTimestamp: -1 } },
    { $group: { _id: '$stationId', doc: { $first: '$$ROOT' } } },
  ]).allowDiskUse(true);

  return new Map(docs.map((d) => [d._id, d.doc]));
}

// Server-side in-memory cache to guarantee sub-second responses and prevent
// Atlas network latency from exceeding client request timeouts.
const CACHE_TTL_MS = 30 * 1000; // 30s cache TTL
let currentAllCache = { data: null, cachedAt: 0 };
let currentAllInFlight = null;

let availableCitiesCache = { data: null, cachedAt: 0 };
let availableCitiesInFlight = null;

function clearAirQualityCache() {
  currentAllCache = { data: null, cachedAt: 0 };
  availableCitiesCache = { data: null, cachedAt: 0 };
}

/**
 * GET /api/air-quality/current
 * Returns the latest real Measurement for every active station.
 */
async function getCurrentAll(req, res, next) {
  try {
    if (!isConnected()) {
      if (process.env.NODE_ENV === 'test') {
        const results = memoryStore.getCurrentAll();
        return res.json({ success: true, count: results.length, data: results });
      }
      return res.status(503).json({
        success: false,
        message: 'MongoDB Atlas is disconnected or initializing. Please retry in a moment.',
      });
    }

    const now = Date.now();
    if (currentAllCache.data && now - currentAllCache.cachedAt < CACHE_TTL_MS) {
      return res.json({
        success: true,
        count: currentAllCache.data.length,
        data: currentAllCache.data,
      });
    }

    if (!currentAllInFlight) {
      currentAllInFlight = (async () => {
        const stations = await Station.find({ status: 'active' })
          .select('-sensors')
          .sort({ country: 1, city: 1, name: 1 })
          .lean();

        const latestMap = await latestByStation();
        const results = stations.map((station) => {
          const latest = latestMap.get(station.stationId) || station.latest || null;
          return { station, latest };
        });

        currentAllCache = {
          data: results,
          cachedAt: Date.now(),
        };
        return results;
      })().finally(() => {
        currentAllInFlight = null;
      });
    }

    const results = await currentAllInFlight;
    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/air-quality/available-cities
 * Returns a list of all distinct cities with their station counts, coordinates, and current real-time AQI.
 */
async function getAvailableCities(req, res, next) {
  try {
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB Atlas is disconnected or initializing. Please retry in a moment.',
      });
    }

    const now = Date.now();
    if (availableCitiesCache.data && now - availableCitiesCache.cachedAt < CACHE_TTL_MS) {
      return res.json({
        success: true,
        count: availableCitiesCache.data.length,
        data: availableCitiesCache.data,
      });
    }

    if (!availableCitiesInFlight) {
      availableCitiesInFlight = (async () => {
        const stations = await Station.find({ status: 'active' }).select('-sensors').lean();

        // Group stations by city in a single pass without N+1 database roundtrips
        const cityMap = new Map();

        for (const st of stations) {
          const cityName = st.city || 'Unknown';
          if (!cityMap.has(cityName)) {
            cityMap.set(cityName, {
              city: cityName,
              state: st.state || '',
              country: st.country || '',
              latitude: st.latitude,
              longitude: st.longitude,
              stationCount: 0,
              latestAqi: null,
              category: null,
              pm25: null,
              pm10: null,
              sourceTimestamp: null,
            });
          }

          const entry = cityMap.get(cityName);
          entry.stationCount += 1;

          // Attach the most recent or highest priority telemetry for this city
          if (st.latest && typeof st.latest.aqi === 'number') {
            if (entry.latestAqi === null || (st.latest.sourceTimestamp && (!entry.sourceTimestamp || new Date(st.latest.sourceTimestamp) > new Date(entry.sourceTimestamp)))) {
              entry.latestAqi = st.latest.aqi;
              entry.category = st.latest.category;
              entry.pm25 = st.latest.pm25;
              entry.pm10 = st.latest.pm10;
              entry.sourceTimestamp = st.latest.sourceTimestamp;
            }
          }
        }

        const citiesArray = Array.from(cityMap.values());
        citiesArray.sort((a, b) => a.city.localeCompare(b.city));

        availableCitiesCache = {
          data: citiesArray,
          cachedAt: Date.now(),
        };
        return citiesArray;
      })().finally(() => {
        availableCitiesInFlight = null;
      });
    }

    const citiesArray = await availableCitiesInFlight;
    res.json({
      success: true,
      count: citiesArray.length,
      data: citiesArray,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/air-quality/lookup?q=locationName
 * Looks up any place in the world (geocode -> nearest OpenAQ station -> live AQI).
 */
async function lookupLocationAQI(req, res, next) {
  try {
    const query = req.query.q || req.query.query;
    if (!query || !query.trim()) {
      throw new ApiError(400, 'Search query is required (e.g. ?q=Chennai or ?q=Delhi)');
    }

    const liveData = await searchLiveLocationAQI(query);
    if (!liveData) {
      let stations = [];
      if (isConnected()) {
        stations = await Station.find({ status: 'active' }).select('city').lean();
      }
      const availableCities = Array.from(new Set(stations.map((s) => s.city).filter(Boolean))).slice(0, 50);

      return res.status(404).json({
        success: false,
        message: `No OpenAQ station with fresh data found near "${query}".`,
        availableCities,
      });
    }

    res.json({
      success: true,
      data: liveData,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/air-quality/:city
 * Returns the latest real reading for every active station in a given city.
 */
async function getCurrentByCity(req, res, next) {
  try {
    const { city } = req.params;
    if (!city || !city.trim()) throw new ApiError(400, 'city parameter is required');

    if (!isConnected()) {
      if (process.env.NODE_ENV === 'test') {
        const results = memoryStore.getCurrentByCity(city);
        return res.json({ success: true, count: results.length, data: results });
      }
      return res.status(503).json({
        success: false,
        message: 'MongoDB Atlas is disconnected or initializing. Please retry in a moment.',
      });
    }

    const stations = await Station.find({
      city: new RegExp(`^${city.trim()}$`, 'i'),
      status: 'active',
    })
      .select('-sensors')
      .lean();

    if (stations.length === 0) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const latestMap = await latestByStation(stations.map((s) => s.stationId));
    const results = stations.map((station) => ({
      station,
      latest: latestMap.get(station.stationId) || station.latest || null,
    }));

    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/history/:stationId?range=24h|7d|30d
 * Returns real stored historical measurements from the database.
 * NEVER creates fake history.
 */
async function getHistory(req, res, next) {
  try {
    const { stationId } = req.params;
    const range = (req.query.range || '24h').toLowerCase();

    if (!RANGE_TO_MS[range]) {
      throw new ApiError(400, `Invalid range "${range}". Use one of: 24h, 7d, 30d`);
    }

    const since = new Date(Date.now() - RANGE_TO_MS[range]);

    if (!isConnected()) {
      if (process.env.NODE_ENV === 'test') {
        const station = memoryStore.getStation(stationId);
        if (!station) throw new ApiError(404, `Station "${stationId}" not found`);
        const measurements = memoryStore.getHistory(stationId, since);
        return res.json({ success: true, station, range, count: measurements.length, data: measurements });
      }
      return res.status(503).json({
        success: false,
        message: 'MongoDB Atlas is disconnected or initializing. Please retry in a moment.',
      });
    }

    const station = await Station.findOne({ stationId }).lean();
    if (!station) throw new ApiError(404, `Station "${stationId}" not found`);

    let measurements = await Measurement.find({
      stationId,
      sourceTimestamp: { $gte: since },
    })
      .sort({ sourceTimestamp: 1 })
      .lean();

    // If no recent measurements in range, include station.latest if within window
    if (measurements.length === 0 && station.latest && station.latest.aqi !== null && station.latest.sourceTimestamp) {
      const ts = new Date(station.latest.sourceTimestamp);
      if (ts >= since) {
        measurements = [{ ...station.latest, stationId: station.stationId }];
      }
    }

    res.json({ success: true, station, range, count: measurements.length, data: measurements });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCurrentAll,
  getAvailableCities,
  lookupLocationAQI,
  getCurrentByCity,
  getHistory,
  clearAirQualityCache,
};
