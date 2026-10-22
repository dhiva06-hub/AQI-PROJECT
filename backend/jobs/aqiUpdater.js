const cron = require('node-cron');
const Station = require('../models/Station');
const Measurement = require('../models/Measurement');
const { fetchStationReading, discoverStations, hasApiKey } = require('../services/externalAPIService');
const { emitAqiUpdate } = require('../sockets/socket');
const { isConnected } = require('../config/db');

const ingestionStatus = {
  lastRunAt: null,
  lastRunDurationMs: null,
  lastRunStationsUpdated: 0,
  lastRunErrors: 0,
  totalRuns: 0,
  totalErrors: 0,
};

function getIngestionStatus() {
  return { ...ingestionStatus };
}

/**
 * Runs one real-time ingestion pass across active stations:
 * 1. Queries active stations from MongoDB Atlas (prioritizing tracked stations up to rate limit capacity)
 * 2. Requests the latest OpenAQ pollutant readings per station
 * 3. Normalizes units and computes AQI (CPCB for India, US EPA elsewhere)
 * 4. Persists the measurement to the Measurement collection
 * 5. Updates the embedded 'latest' field on the Station document
 * 6. Broadcasts live telemetry over Socket.IO
 *
 * NEVER produces or falls back to fake or simulated data.
 */
let running = false;

async function runIngestionPass() {
  if (running) {
    console.log('[aqiUpdater] Previous pass still running - skipping this tick.');
    return;
  }
  running = true;
  const start = Date.now();
  let updated = 0;
  let errors = 0;

  console.log('[aqiUpdater] Starting live OpenAQ ingestion pass...');

  if (!hasApiKey()) {
    console.error('[aqiUpdater] OPENAQ_API_KEY missing - skipping pass (no data is fabricated).');
    ingestionStatus.lastRunAt = new Date();
    ingestionStatus.totalRuns += 1;
    running = false;
    return;
  }

  try {
    if (!isConnected()) {
      console.warn('[aqiUpdater] MongoDB is not connected - skipping ingestion pass.');
      return;
    }

    const maxStations = parseInt(process.env.OPENAQ_MAX_STATIONS || '300', 10) || 300;
    const wantedCountries = (process.env.OPENAQ_COUNTRIES || '')
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    let stations = [];
    if (wantedCountries.length > 0) {
      stations = await Station.find({
        status: 'active',
        countryCode: { $in: wantedCountries },
      })
        .limit(maxStations)
        .lean();
    } else {
      // Prioritize stations with trackHistory: true, then fill up with active stations having sensors
      const trackedStations = await Station.find({ status: 'active', trackHistory: true })
        .limit(maxStations)
        .lean();

      if (trackedStations.length < maxStations) {
        const remainingLimit = maxStations - trackedStations.length;
        const trackedIds = trackedStations.map((s) => s.stationId);
        const additionalStations = await Station.find({
          status: 'active',
          stationId: { $nin: trackedIds },
          'sensors.0': { $exists: true },
        })
          .limit(remainingLimit)
          .lean();

        stations = [...trackedStations, ...additionalStations];
      } else {
        stations = trackedStations;
      }
    }

    if (stations.length === 0) {
      // If collection is empty, discover real OpenAQ stations and store them
      const totalInDb = await Station.countDocuments();
      if (totalInDb === 0) {
        console.log('[aqiUpdater] Database is empty. Running initial OpenAQ discovery...');
        const found = await discoverStations();
        if (found.length) {
          await Station.insertMany(found);
          stations = found.slice(0, maxStations);
        }
      }
    }

    console.log(`[aqiUpdater] Polling fresh readings for ${stations.length} target stations...`);

    for (const station of stations) {
      try {
        const reading = await fetchStationReading(station);
        if (!reading) {
          errors += 1;
          continue;
        }

        // 1. Persist to time-series measurements collection
        const measurement = await Measurement.create(reading);

        // 2. Persist snapshot to Station.latest document in MongoDB Atlas
        await Station.updateOne(
          { stationId: station.stationId },
          {
            $set: {
              latest: reading,
              updatedAt: new Date(),
            },
          }
        );

        // 3. Emit real-time telemetry event
        emitAqiUpdate(measurement.toObject ? measurement.toObject() : measurement);
        updated += 1;
      } catch (err) {
        errors += 1;
        console.error(`[aqiUpdater Database Error] Failed to persist measurement for ${station.stationId}: ${err.message}`);
      }
    }
  } finally {
    running = false;
    ingestionStatus.lastRunAt = new Date();
    ingestionStatus.lastRunDurationMs = Date.now() - start;
    ingestionStatus.lastRunStationsUpdated = updated;
    ingestionStatus.lastRunErrors = errors;
    ingestionStatus.totalRuns += 1;
    ingestionStatus.totalErrors += errors;
    console.log(
      `[aqiUpdater Pass Complete] ${updated} stations updated with real OpenAQ data, ${errors} stations skipped/errored, duration: ${ingestionStatus.lastRunDurationMs}ms`
    );
  }
}

/**
 * Schedules the recurring ingestion job. Cron expression comes from
 * AQI_POLL_CRON (defaults to every 30 minutes - OpenAQ allows 2,000 requests/hour).
 */
function scheduleAqiUpdater() {
  const expr = process.env.AQI_POLL_CRON || '*/30 * * * *';
  cron.schedule(expr, () => {
    runIngestionPass().catch((err) => console.error('[aqiUpdater] Unexpected scheduler error:', err));
  });
  console.log(`[aqiUpdater] Scheduled with cron expression "${expr}"`);
}

module.exports = { scheduleAqiUpdater, runIngestionPass, getIngestionStatus };
