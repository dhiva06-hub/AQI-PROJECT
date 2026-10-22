const axios = require('axios');
const { normalizeOpenAqLatest, parameterKey, categoryForAQI, standardForCountry } = require('./dataNormalizer');

const OPENAQ_BASE_URL = 'https://api.openaq.org/v3';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * OpenAQ's free key allows 60 requests/minute and 2,000/hour. Every request goes through
 * pace() so we never burst: default 1.1 s between calls (~55/min).
 */
let nextSlot = 0;
function minIntervalMs() {
  const v = parseInt(process.env.OPENAQ_MIN_INTERVAL_MS || '1100', 10);
  return Number.isFinite(v) && v >= 0 ? v : 1100;
}
async function pace() {
  const gap = minIntervalMs();
  if (gap === 0) return;
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + gap;
  if (wait) await sleep(wait);
}

function getApiKey() {
  const key = process.env.OPENAQ_API_KEY;
  return key && key.trim() !== '' ? key.trim() : null;
}

function hasApiKey() {
  return getApiKey() !== null;
}

function maxAgeMs() {
  const hours = parseFloat(process.env.OPENAQ_MAX_AGE_HOURS || '96');
  return (Number.isFinite(hours) && hours > 0 ? hours : 96) * 60 * 60 * 1000;
}

function minPollutants() {
  const n = parseInt(process.env.AQI_MIN_POLLUTANTS || '1', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * GET against OpenAQ v3 with the X-API-Key header.
 * Retries on 429 / 5xx / timeouts. Returns the parsed body, or null on failure.
 */
async function openaqGet(path, params = {}) {
  const key = getApiKey();
  if (!key) {
    console.error('[OpenAQ] OPENAQ_API_KEY is not set. Get a free key at https://explore.openaq.org/register and add it to backend/.env');
    return null;
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    await pace();
    try {
      const res = await axios.get(`${OPENAQ_BASE_URL}${path}`, {
        params,
        timeout: REQUEST_TIMEOUT_MS,
        headers: { 'X-API-Key': key, Accept: 'application/json' },
      });
      return res.data;
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        console.error(`[OpenAQ Auth] HTTP ${status} - check OPENAQ_API_KEY`);
        return null;
      }
      if (status === 404 || status === 410 || status === 422) {
        console.warn(`[OpenAQ] ${path} -> HTTP ${status}`);
        return null;
      }
      const retryable = status === 429 || (status >= 500) || err.code === 'ECONNABORTED' || !err.response;
      if (!retryable || attempt === MAX_RETRIES) {
        console.error(`[OpenAQ Error] ${path} failed: ${status ? `HTTP ${status}` : err.message}`);
        return null;
      }
      const retryAfter = parseInt(err.response?.headers?.['retry-after'], 10);
      const wait = Number.isFinite(retryAfter) ? retryAfter * 1000 : 1500 * (attempt + 1);
      console.warn(`[OpenAQ] ${path} -> ${status || err.code}, retrying in ${wait}ms`);
      await sleep(wait);
    }
  }
  return null;
}

/** Sensors of an OpenAQ location -> [{ sensorId, parameter, units }] (only the 6 CPCB pollutants). */
function extractSensors(location) {
  return (location.sensors || [])
    .map((s) => ({
      sensorId: s.id,
      parameter: parameterKey(s.parameter?.name),
      units: s.parameter?.units || null,
    }))
    .filter((s) => s.sensorId && s.parameter);
}

function slug(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Converts an OpenAQ location into our Station document shape. */
function locationToStation(location) {
  const sensors = extractSensors(location);
  const country = location.country?.name || 'Unknown';
  return {
    stationId: `openaq-${location.id}`,
    name: location.name || `Station ${location.id}`,
    city: location.locality || country, // OpenAQ "locality" is often empty -> fall back to the country
    state: '',
    country,
    countryCode: location.country?.code || null,
    latitude: location.coordinates?.latitude,
    longitude: location.coordinates?.longitude,
    source: 'openaq',
    externalUid: String(location.id), // OpenAQ location id
    sensors,
    status: 'active',
  };
}

function distinctPollutants(sensors) {
  return new Set(sensors.map((s) => s.parameter)).size;
}

/**
 * Finds real, recently-reporting OpenAQ stations for the whole world (or only the countries
 * in OPENAQ_COUNTRIES, e.g. "IN,US,GB").
 *
 * For each country: keep non-mobile locations that report PM2.5 or PM10 and have reported in
 * the last 24 h, rank them (reference-grade monitors first, then more pollutants, then newest),
 * and take up to `perCountry`, preferring different localities. The final list interleaves
 * countries (everyone's #1 first, then #2 ...) and is capped at `max` stations so the
 * hourly request budget is respected.
 *
 * Costs about 1 request per country, paced to OpenAQ's rate limit.
 */
async function discoverStations({ perCountry, max } = {}) {
  const perCountryLimit = perCountry || parseInt(process.env.OPENAQ_STATIONS_PER_COUNTRY || '3', 10) || 3;
  const maxStations = max || parseInt(process.env.OPENAQ_MAX_STATIONS || '300', 10) || 300;
  const wanted = (process.env.OPENAQ_COUNTRIES || '')
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  const cutoff = Date.now() - 24 * 60 * 60 * 1000; // must have reported in the last 24h

  const countriesBody = await openaqGet('/countries', { limit: 1000 });
  let countries = countriesBody?.results || [];
  if (countries.length === 0) {
    console.error('[OpenAQ] Could not load the country list - no stations discovered.');
    return [];
  }
  if (wanted.length) countries = countries.filter((c) => wanted.includes(String(c.code).toUpperCase()));
  console.log(`[OpenAQ] Discovering stations in ${countries.length} countries (up to ${perCountryLimit} each, max ${maxStations})...`);

  const perCountryLists = [];
  let done = 0;
  for (const c of countries) {
    done += 1;
    const body = await openaqGet('/locations', { countries_id: c.id, limit: 1000 });
    const ranked = (body?.results || [])
      .filter((loc) => !loc.isMobile && loc.coordinates)
      .map((loc) => ({ loc, sensors: extractSensors(loc) }))
      .filter(({ loc, sensors }) => {
        const hasPM = sensors.some((x) => x.parameter === 'pm25' || x.parameter === 'pm10');
        const last = new Date(loc.datetimeLast?.utc || 0).getTime();
        return hasPM && last >= cutoff;
      })
      .sort((a, b) => {
        if (!!b.loc.isMonitor !== !!a.loc.isMonitor) return b.loc.isMonitor ? 1 : -1;
        const dp = distinctPollutants(b.sensors) - distinctPollutants(a.sensors);
        if (dp !== 0) return dp;
        return new Date(b.loc.datetimeLast.utc) - new Date(a.loc.datetimeLast.utc);
      });

    // Prefer different localities, then fill up with the remaining best ones.
    const chosen = [];
    const seenLocality = new Set();
    for (const item of ranked) {
      const key = item.loc.locality || item.loc.name;
      if (chosen.length < perCountryLimit && !seenLocality.has(key)) {
        seenLocality.add(key);
        chosen.push(item);
      }
    }
    for (const item of ranked) {
      if (chosen.length >= perCountryLimit) break;
      if (!chosen.includes(item)) chosen.push(item);
    }

    if (chosen.length) {
      perCountryLists.push(chosen.map(({ loc }) => locationToStation({ ...loc, country: loc.country || { name: c.name, code: c.code } })));
    }
    if (done % 20 === 0 || done === countries.length) {
      console.log(`[OpenAQ] Discovery ${done}/${countries.length} countries checked`);
    }
  }

  // Interleave by rank so a station cap never drops whole countries.
  const stations = [];
  const seen = new Set();
  for (let rank = 0; rank < perCountryLimit && stations.length < maxStations; rank += 1) {
    for (const list of perCountryLists) {
      const st = list[rank];
      if (st && !seen.has(st.stationId) && stations.length < maxStations) {
        seen.add(st.stationId);
        stations.push(st);
      }
    }
  }
  console.log(`[OpenAQ] Discovery complete: ${stations.length} stations in ${perCountryLists.length} countries.`);
  return stations;
}

/**
 * Fetches one station's latest readings from OpenAQ and converts them to a CPCB AQI.
 * Returns null if OpenAQ is unreachable or the data is missing / stale.
 * NEVER produces simulated or fake data.
 */
async function fetchStationReading(station) {
  const locationId = station.externalUid;
  if (!locationId || !Array.isArray(station.sensors) || station.sensors.length === 0) {
    console.warn(`[OpenAQ] Station ${station.stationId} has no OpenAQ location/sensors - skipped`);
    return null;
  }

  const body = await openaqGet(`/locations/${locationId}/latest`, { limit: 1000 });
  if (!body || !Array.isArray(body.results)) return null;

  const reading = normalizeOpenAqLatest(station.stationId, station.sensors, body.results, {
    maxAgeMs: maxAgeMs(),
    minPollutants: minPollutants(),
    standard: standardForCountry(station.countryCode),
  });

  if (!reading) {
    console.warn(`[OpenAQ] Station ${station.stationId} skipped: no fresh PM2.5/PM10 data`);
    return null;
  }

  console.log(`[OpenAQ] ${station.stationId} -> AQI ${reading.aqi} (${reading.category}, ${reading.standard}, dominant ${reading.dominantPollutant})`);
  return reading;
}

/** Looks up a place name -> coordinates (OpenStreetMap Nominatim, worldwide). */
async function geocode(query) {
  try {
    const res = await axios.get(NOMINATIM_URL, {
      params: { q: query, format: 'json', limit: 1 },
      timeout: REQUEST_TIMEOUT_MS,
      headers: { 'User-Agent': 'aqi-aggregator/1.0 (student project)' },
    });
    const hit = res.data?.[0];
    if (!hit) return null;
    return { lat: parseFloat(hit.lat), lon: parseFloat(hit.lon), name: hit.display_name };
  } catch (err) {
    console.error(`[Geocode Error] "${query}": ${err.message}`);
    return null;
  }
}

/**
 * On-demand lookup for any place in the world: geocode -> nearest OpenAQ stations
 * within 25 km -> latest AQI from the closest one that has fresh PM data.
 */
async function searchLiveLocationAQI(query) {
  if (!query || typeof query !== 'string' || !query.trim()) return null;
  const clean = query.trim();

  const geo = await geocode(clean);
  if (!geo) {
    console.log(`[OpenAQ Search] Could not geocode "${clean}"`);
    return null;
  }

  const body = await openaqGet('/locations', {
    coordinates: `${geo.lat},${geo.lon}`,
    radius: 25000,
    limit: 50,
  });
  const nearby = (body?.results || [])
    .filter((loc) => !loc.isMobile && loc.coordinates)
    .map((loc) => ({
      loc,
      sensors: extractSensors(loc),
      dist: Math.hypot(loc.coordinates.latitude - geo.lat, loc.coordinates.longitude - geo.lon),
    }))
    .filter(({ sensors }) => sensors.some((s) => s.parameter === 'pm25' || s.parameter === 'pm10'))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 5);

  for (const { loc, sensors } of nearby) {
    const latestBody = await openaqGet(`/locations/${loc.id}/latest`, { limit: 1000 });
    const latest = normalizeOpenAqLatest(`openaq-${loc.id}`, sensors, latestBody?.results || [], {
      maxAgeMs: maxAgeMs(),
      minPollutants: minPollutants(),
      standard: standardForCountry(loc.country?.code),
    });
    if (!latest) continue;

    return {
      found: true,
      query: clean,
      location: {
        name: loc.name,
        state: '',
        country: loc.country?.name || '',
        latitude: loc.coordinates.latitude,
        longitude: loc.coordinates.longitude,
      },
      latest,
    };
  }

  console.log(`[OpenAQ Search] No station with fresh data near "${clean}"`);
  return null;
}

module.exports = {
  hasApiKey,
  discoverStations,
  fetchStationReading,
  searchLiveLocationAQI,
  categoryForAQI,
};
