const Alert = require('../models/Alert');
const Station = require('../models/Station');
const { ApiError } = require('../middleware/errorHandler');
const { isConnected } = require('../config/db');

let syncInFlight = false;

/**
 * Automatically creates alerts from real station readings if none exist yet.
 * Only uses verified real readings from MongoDB Atlas with severe AQI levels (>= 200).
 */
async function syncRealStationAlerts() {
  if (syncInFlight) return;
  syncInFlight = true;
  try {
    const existingCount = await Alert.countDocuments();
    if (existingCount > 0) return;

    // Scan stations with real elevated or critical readings in MongoDB Atlas
    const elevatedStations = await Station.find({
      status: 'active',
      'latest.aqi': { $gte: 200 },
    })
      .select('stationId name city country latest')
      .limit(50)
      .lean();

    if (elevatedStations.length === 0) return;

    const alertDocs = elevatedStations.map((st) => {
      const aqi = st.latest.aqi;
      const category = st.latest.category || 'High Pollution';
      const severity = aqi >= 300 ? 'critical' : 'warning';
      const dominant = st.latest.dominantPollutant ? ` Dominant pollutant: ${st.latest.dominantPollutant.toUpperCase()}.` : '';
      return {
        stationId: st.stationId,
        aqi,
        category,
        severity,
        message: `Air quality threshold exceeded at ${st.name} (${st.city}, ${st.country}): AQI ${aqi} (${category}).${dominant}`,
        triggeredAt: st.latest.sourceTimestamp || new Date(),
        acknowledged: false,
      };
    });

    await Alert.insertMany(alertDocs, { ordered: false });
    console.log(`[alerts] Synchronized ${alertDocs.length} real station alerts from Atlas telemetry.`);
  } catch (err) {
    console.warn(`[alerts] Real alert sync notice: ${err.message}`);
  } finally {
    syncInFlight = false;
  }
}

/**
 * GET /api/alerts
 * Returns active air quality alerts from MongoDB Atlas with optional filters.
 */
async function listAlerts(req, res, next) {
  try {
    if (!isConnected()) {
      if (process.env.NODE_ENV === 'test') {
        return res.json({ success: true, count: 0, data: [] });
      }
      return res.status(503).json({
        success: false,
        message: 'MongoDB Atlas is disconnected or initializing. Please retry in a moment.',
      });
    }

    const { severity, stationId, acknowledged, limit = 100 } = req.query;
    const filter = {};

    if (severity && severity !== 'ALL') {
      filter.severity = severity.toLowerCase();
    }
    if (stationId) {
      filter.stationId = stationId;
    }
    if (acknowledged !== undefined) {
      filter.acknowledged = acknowledged === 'true';
    }

    // Sync any real alerts if collection is currently empty
    await syncRealStationAlerts();

    const alerts = await Alert.find(filter)
      .sort({ triggeredAt: -1 })
      .limit(parseInt(limit, 10) || 100)
      .lean();

    res.json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/alerts/:id
 */
async function getAlert(req, res, next) {
  try {
    const { id } = req.params;

    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB Atlas is disconnected or initializing. Please retry in a moment.',
      });
    }

    const alert = await Alert.findById(id).lean();
    if (!alert) throw new ApiError(404, `Alert "${id}" not found`);

    res.json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/alerts/:id/ack
 */
async function acknowledgeAlert(req, res, next) {
  try {
    const { id } = req.params;

    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB Atlas is disconnected or initializing. Please retry in a moment.',
      });
    }

    const alert = await Alert.findByIdAndUpdate(
      id,
      { acknowledged: true },
      { new: true }
    ).lean();

    if (!alert) throw new ApiError(404, `Alert "${id}" not found`);

    res.json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listAlerts,
  getAlert,
  acknowledgeAlert,
  syncRealStationAlerts,
};
