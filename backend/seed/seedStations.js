/**
 * Discovers real OpenAQ monitoring stations worldwide (see OPENAQ_COUNTRIES,
 * OPENAQ_STATIONS_PER_COUNTRY, OPENAQ_MAX_STATIONS) and stores them in MongoDB.
 * Takes a few minutes: OpenAQ's rate limit is 60 requests/minute.
 * Run with: npm run seed (from backend/)   -- needs OPENAQ_API_KEY and MONGODB_URI in .env
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Station = require('../models/Station');
const { discoverStations, hasApiKey } = require('../services/externalAPIService');

async function seed() {
  if (!hasApiKey()) {
    console.error('OPENAQ_API_KEY is not set. Get a free key at https://explore.openaq.org/register and add it to .env');
    process.exit(1);
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Check .env first.');
    process.exit(1);
  }

  const stations = await discoverStations();
  if (stations.length === 0) {
    console.error('[seed] No OpenAQ stations found. Check your API key / network and try again. Existing data was NOT touched.');
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log('[seed] Connected to MongoDB');

  await Station.deleteMany({});
  for (const station of stations) {
    await Station.create(station);
    console.log(`[seed] Inserted: ${station.name} (${station.city}, ${station.country}) [OpenAQ location ${station.externalUid}, ${station.sensors.length} sensors]`);
  }

  console.log(`[seed] Done - ${stations.length} real OpenAQ stations seeded.`);
  await mongoose.disconnect();
  process.exit(0);
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('[seed] Failed:', err);
    process.exit(1);
  });
}

module.exports = { seed };
