/**
 * Converts raw OpenAQ pollutant concentrations into an AQI.
 *
 * OpenAQ returns concentrations (PM2.5, PM10, NO2, SO2, CO, O3), not an AQI.
 * Steps:  1) convert units  2) sub-index per pollutant (linear interpolation
 * over the breakpoints of the chosen standard)  3) AQI = highest sub-index.
 *
 * Two standards are supported (both 0-500, six levels):
 *   - CPCB   : Indian National AQI   (used for stations in India)
 *   - US_EPA : US EPA AQI            (used everywhere else - the common global scale)
 *
 * Canonical internal units: PM / NO2 / SO2 / O3 in ug/m3, CO in mg/m3.
 */

// [concLow, concHigh, indexLow, indexHigh] - CPCB National AQI breakpoints
const BREAKPOINTS = {
  pm25: [[0, 30, 0, 50], [31, 60, 51, 100], [61, 90, 101, 200], [91, 120, 201, 300], [121, 250, 301, 400], [250, 500, 401, 500]],
  pm10: [[0, 50, 0, 50], [51, 100, 51, 100], [101, 250, 101, 200], [251, 350, 201, 300], [351, 430, 301, 400], [430, 600, 401, 500]],
  no2: [[0, 40, 0, 50], [41, 80, 51, 100], [81, 180, 101, 200], [181, 280, 201, 300], [281, 400, 301, 400], [400, 800, 401, 500]],
  so2: [[0, 40, 0, 50], [41, 80, 51, 100], [81, 380, 101, 200], [381, 800, 201, 300], [801, 1600, 301, 400], [1600, 2400, 401, 500]],
  co: [[0, 1.0, 0, 50], [1.1, 2.0, 51, 100], [2.1, 10, 101, 200], [10.1, 17, 201, 300], [17.1, 34, 301, 400], [34, 50, 401, 500]],
  o3: [[0, 50, 0, 50], [51, 100, 51, 100], [101, 168, 101, 200], [169, 208, 201, 300], [209, 748, 301, 400], [748, 1000, 401, 500]],
};


// US EPA AQI breakpoints (2024 PM2.5 revision). Concentration units are native to the EPA tables:
// PM in ug/m3, O3 and CO in ppm, NO2 and SO2 in ppb.
const EPA_BREAKPOINTS = {
  pm25: [[0, 9.0, 0, 50], [9.1, 35.4, 51, 100], [35.5, 55.4, 101, 150], [55.5, 125.4, 151, 200], [125.5, 225.4, 201, 300], [225.5, 325.4, 301, 500]],
  pm10: [[0, 54, 0, 50], [55, 154, 51, 100], [155, 254, 101, 150], [255, 354, 151, 200], [355, 424, 201, 300], [425, 604, 301, 500]],
  o3: [[0, 0.054, 0, 50], [0.055, 0.070, 51, 100], [0.071, 0.085, 101, 150], [0.086, 0.105, 151, 200], [0.106, 0.200, 201, 300], [0.200, 0.604, 301, 500]],
  co: [[0, 4.4, 0, 50], [4.5, 9.4, 51, 100], [9.5, 12.4, 101, 150], [12.5, 15.4, 151, 200], [15.5, 30.4, 201, 300], [30.5, 50.4, 301, 500]],
  so2: [[0, 35, 0, 50], [36, 75, 51, 100], [76, 185, 101, 150], [186, 304, 151, 200], [305, 604, 201, 300], [605, 1004, 301, 500]],
  no2: [[0, 53, 0, 50], [54, 100, 51, 100], [101, 360, 101, 150], [361, 649, 151, 200], [650, 1249, 201, 300], [1250, 2049, 301, 500]],
};

const STANDARDS = {
  CPCB: {
    name: 'Indian CPCB AQI',
    labels: ['Good', 'Satisfactory', 'Moderate', 'Poor', 'Very Poor', 'Severe'],
    upper: [50, 100, 200, 300, 400, Infinity],
  },
  US_EPA: {
    name: 'US EPA AQI',
    labels: ['Good', 'Moderate', 'Unhealthy for Sensitive Groups', 'Unhealthy', 'Very Unhealthy', 'Hazardous'],
    upper: [50, 100, 150, 200, 300, Infinity],
  },
};

const POLLUTANTS = Object.keys(BREAKPOINTS);

// Molecular weights (g/mol) for ppb/ppm -> ug/m3 at 25 C, 1 atm (molar volume 24.45 L)
const MOLECULAR_WEIGHT = { no2: 46.0055, so2: 64.066, o3: 47.9982, co: 28.01 };
const MOLAR_VOLUME = 24.45;

/** Level 1-6 of an AQI value on the given standard (1 = Good ... 6 = worst). */
function levelForAQI(aqi, standard = 'CPCB') {
  if (aqi === null || aqi === undefined || Number.isNaN(aqi)) return null;
  const num = typeof aqi === 'number' ? aqi : parseFloat(aqi);
  if (Number.isNaN(num) || num < 0) return null;
  const scale = STANDARDS[standard] || STANDARDS.CPCB;
  return scale.upper.findIndex((u) => num <= u) + 1;
}

/** Category label of an AQI value (defaults to the Indian CPCB scale). */
function categoryForAQI(aqi, standard = 'CPCB') {
  const level = levelForAQI(aqi, standard);
  if (!level) return null;
  return (STANDARDS[standard] || STANDARDS.CPCB).labels[level - 1];
}

/**
 * Which AQI scale to use for a country code.
 * AQI_STANDARD=auto (default): India -> CPCB, everywhere else -> US_EPA.
 * Set AQI_STANDARD=CPCB or US_EPA to force one scale for every station.
 */
function standardForCountry(countryCode) {
  const forced = String(process.env.AQI_STANDARD || 'auto').toUpperCase();
  if (forced === 'CPCB' || forced === 'US_EPA') return forced;
  return String(countryCode || '').toUpperCase() === 'IN' ? 'CPCB' : 'US_EPA';
}

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

/** OpenAQ parameter name -> our key (pm25, pm10, no2, so2, co, o3) or null. */
function parameterKey(name) {
  if (!name) return null;
  const n = String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (n === 'pm25') return 'pm25';
  return POLLUTANTS.includes(n) ? n : null;
}

/**
 * Converts an OpenAQ value to CPCB units. Returns null for unusable units.
 * CO -> mg/m3, everything else -> ug/m3.
 */
function toCpcbUnits(key, value, units) {
  if (!isFiniteNumber(value) || value < 0) return null;
  const u = String(units || '').toLowerCase().replace('µ', 'u').replace('μ', 'u').replace('³', '3').replace(/\s/g, '');

  if (key === 'pm25' || key === 'pm10') {
    return u === 'ug/m3' || u === 'ugm3' ? value : null;
  }

  const mw = MOLECULAR_WEIGHT[key];
  let ugm3;
  if (u === 'ug/m3' || u === 'ugm3') ugm3 = value;
  else if (u === 'mg/m3' || u === 'mgm3') ugm3 = value * 1000;
  else if (u === 'ppb') ugm3 = (value * mw) / MOLAR_VOLUME;
  else if (u === 'ppm') ugm3 = (value * 1000 * mw) / MOLAR_VOLUME;
  else return null;

  return key === 'co' ? ugm3 / 1000 : ugm3;
}

/** Canonical units (ug/m3, CO mg/m3) -> EPA table units (O3 / CO in ppm, NO2 / SO2 in ppb). */
function toEpaUnits(key, conc) {
  if (key === 'pm25' || key === 'pm10') return conc;
  const mw = MOLECULAR_WEIGHT[key];
  if (key === 'no2' || key === 'so2') return (conc * MOLAR_VOLUME) / mw; // ug/m3 -> ppb
  if (key === 'o3') return (conc * MOLAR_VOLUME) / mw / 1000; // ug/m3 -> ppm
  if (key === 'co') return (conc * MOLAR_VOLUME) / mw; // mg/m3 -> ppm
  return conc;
}

/** Sub-index for one pollutant. `conc` is in canonical units (see top); converted for US_EPA. */
function subIndex(key, conc, standard = 'CPCB') {
  const table = (standard === 'US_EPA' ? EPA_BREAKPOINTS : BREAKPOINTS)[key];
  if (!table || !isFiniteNumber(conc) || conc < 0) return null;
  if (standard === 'US_EPA') conc = toEpaUnits(key, conc);

  // A value in the small gap between two bands (e.g. 30.5) starts the next band.
  for (const [cLow, cHigh, iLow, iHigh] of table) {
    if (conc <= cHigh) {
      const c = Math.max(conc, cLow);
      return Math.round(iLow + ((iHigh - iLow) * (c - cLow)) / (cHigh - cLow));
    }
  }
  return 500; // beyond the last band
}

/**
 * pollutants: { pm25, pm10, no2, so2, co, o3 } in CPCB units (null if missing).
 * Returns { aqi, dominant, subIndices, count } or null.
 *  - needs PM2.5 or PM10
 *  - needs at least `minPollutants` pollutants (the CPCB rule is 3)
 */
function computeAQI(pollutants, minPollutants = 1, standard = 'CPCB') {
  const subIndices = {};
  for (const key of POLLUTANTS) {
    const idx = subIndex(key, pollutants[key], standard);
    if (idx !== null) subIndices[key] = idx;
  }
  const keys = Object.keys(subIndices);
  if (keys.length < minPollutants) return null;
  if (subIndices.pm25 === undefined && subIndices.pm10 === undefined) return null;

  let dominant = keys[0];
  for (const k of keys) if (subIndices[k] > subIndices[dominant]) dominant = k;

  return { aqi: subIndices[dominant], dominant, subIndices, count: keys.length };
}

/**
 * Builds our Measurement shape from OpenAQ "latest" results.
 *
 * @param {string} stationId
 * @param {Array}  sensors       station.sensors: [{ sensorId, parameter, units }]
 * @param {Array}  latestResults OpenAQ /locations/{id}/latest `results`
 * @param {object} opts          { maxAgeMs, minPollutants, now }
 * Returns null when there is not enough fresh data. NEVER fabricates values.
 */
function normalizeOpenAqLatest(stationId, sensors, latestResults, opts = {}) {
  if (!Array.isArray(sensors) || !Array.isArray(latestResults)) return null;
  const now = opts.now || Date.now();
  const maxAgeMs = opts.maxAgeMs ?? 3 * 60 * 60 * 1000;

  const bySensor = new Map(sensors.map((s) => [Number(s.sensorId), s]));
  const values = { pm25: null, pm10: null, no2: null, so2: null, co: null, o3: null };
  let newest = 0;

  for (const r of latestResults) {
    const sensor = bySensor.get(Number(r.sensorsId));
    if (!sensor) continue;
    const key = parameterKey(sensor.parameter);
    if (!key) continue;

    const ts = new Date(r.datetime?.utc || r.datetime?.local || 0).getTime();
    if (!ts || now - ts > maxAgeMs || ts - now > 10 * 60 * 1000) continue; // stale or future

    const conc = toCpcbUnits(key, r.value, sensor.units);
    if (conc === null) continue;

    values[key] = conc;
    if (ts > newest) newest = ts;
  }

  const standard = opts.standard || 'CPCB';
  const result = computeAQI(values, opts.minPollutants ?? 1, standard);
  if (!result) return null;

  const category = categoryForAQI(result.aqi, standard);
  const level = levelForAQI(result.aqi, standard);
  const round = (v, d = 1) => (v === null ? null : Number(v.toFixed(d)));

  return {
    stationId,
    aqi: result.aqi,
    category,
    level,
    standard,
    pm25: round(values.pm25),
    pm10: round(values.pm10),
    no2: round(values.no2),
    so2: round(values.so2),
    co: round(values.co, 2),
    o3: round(values.o3),
    dominantPollutant: result.dominant,
    pollutantCount: result.count,
    source: 'openaq',
    sourceTimestamp: new Date(newest),
  };
}

module.exports = {
  STANDARDS,
  categoryForAQI,
  levelForAQI,
  standardForCountry,
  parameterKey,
  toCpcbUnits,
  subIndex,
  computeAQI,
  normalizeOpenAqLatest,
};
