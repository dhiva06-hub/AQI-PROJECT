const {
  categoryForAQI,
  levelForAQI,
  standardForCountry,
  subIndex,
  toCpcbUnits,
  computeAQI,
  parameterKey,
  normalizeOpenAqLatest,
} = require('../services/dataNormalizer');

const NOW = new Date('2026-10-20T10:00:00Z').getTime();
const iso = (minAgo) => new Date(NOW - minAgo * 60000).toISOString();

const SENSORS = [
  { sensorId: 1, parameter: 'pm25', units: 'µg/m³' },
  { sensorId: 2, parameter: 'pm10', units: 'µg/m³' },
  { sensorId: 3, parameter: 'no2', units: 'ppb' },
  { sensorId: 4, parameter: 'co', units: 'ppm' },
];

describe('parameterKey', () => {
  test('maps OpenAQ parameter names', () => {
    expect(parameterKey('pm25')).toBe('pm25');
    expect(parameterKey('PM10')).toBe('pm10');
    expect(parameterKey('temperature')).toBeNull();
  });
});

describe('toCpcbUnits', () => {
  test('keeps ug/m3 values, converts ppb / ppm', () => {
    expect(toCpcbUnits('pm25', 40, 'µg/m³')).toBe(40);
    expect(toCpcbUnits('no2', 20, 'ppb')).toBeCloseTo(37.63, 1);
    expect(toCpcbUnits('co', 0.5, 'ppm')).toBeCloseTo(0.57, 2); // mg/m3
    expect(toCpcbUnits('co', 1200, 'µg/m³')).toBeCloseTo(1.2, 5); // -> mg/m3
  });
  test('rejects unknown units and negative values', () => {
    expect(toCpcbUnits('pm25', 40, 'ppm')).toBeNull();
    expect(toCpcbUnits('no2', 5, 'weird')).toBeNull();
    expect(toCpcbUnits('pm25', -3, 'µg/m³')).toBeNull();
  });
});

describe('subIndex (CPCB breakpoints)', () => {
  test('band edges', () => {
    expect(subIndex('pm25', 30)).toBe(50);
    expect(subIndex('pm25', 60)).toBe(100);
    expect(subIndex('pm10', 100)).toBe(100);
    expect(subIndex('pm10', 250)).toBe(200);
  });
  test('interpolates inside a band', () => {
    expect(subIndex('pm25', 45)).toBe(75);
    expect(subIndex('co', 1.5)).toBe(73);
  });
  test('caps at 500 beyond the last band', () => {
    expect(subIndex('pm25', 999)).toBe(500);
  });
});

describe('computeAQI', () => {
  test('AQI is the highest sub-index and names the dominant pollutant', () => {
    const r = computeAQI({ pm25: 45, pm10: 60, no2: null, so2: null, co: null, o3: null });
    expect(r.aqi).toBe(75);
    expect(r.dominant).toBe('pm25');
    expect(r.count).toBe(2);
  });
  test('requires PM2.5 or PM10', () => {
    expect(computeAQI({ pm25: null, pm10: null, no2: 50, so2: 10, co: 1, o3: 40 })).toBeNull();
  });
  test('honours the minimum pollutant count', () => {
    const only = { pm25: 45, pm10: null, no2: null, so2: null, co: null, o3: null };
    expect(computeAQI(only, 1)).not.toBeNull();
    expect(computeAQI(only, 3)).toBeNull();
  });
});

describe('normalizeOpenAqLatest', () => {
  const results = [
    { sensorsId: 1, value: 45, datetime: { utc: iso(20) } },
    { sensorsId: 2, value: 60, datetime: { utc: iso(25) } },
    { sensorsId: 3, value: 20, datetime: { utc: iso(30) } },
    { sensorsId: 4, value: 0.5, datetime: { utc: iso(30) } },
    { sensorsId: 99, value: 500, datetime: { utc: iso(5) } }, // unknown sensor, ignored
  ];

  test('builds a measurement with CPCB AQI from raw concentrations', () => {
    const m = normalizeOpenAqLatest('openaq-1', SENSORS, results, { now: NOW });
    expect(m.stationId).toBe('openaq-1');
    expect(m.aqi).toBe(75);
    expect(m.category).toBe('Satisfactory');
    expect(m.pm25).toBe(45);
    expect(m.no2).toBeCloseTo(37.6, 1);
    expect(m.co).toBeCloseTo(0.57, 2);
    expect(m.dominantPollutant).toBe('pm25');
    expect(m.source).toBe('openaq');
    expect(m.sourceTimestamp.toISOString()).toBe(iso(20));
  });

  test('drops stale readings and returns null when nothing fresh is left', () => {
    const stale = results.map((r) => ({ ...r, datetime: { utc: iso(60 * 6) } }));
    expect(normalizeOpenAqLatest('s', SENSORS, stale, { now: NOW })).toBeNull();
  });

  test('missing pollutants stay null (never fabricated)', () => {
    const m = normalizeOpenAqLatest('s', SENSORS, [results[0]], { now: NOW });
    expect(m.pm10).toBeNull();
    expect(m.no2).toBeNull();
    expect(m.so2).toBeNull();
    expect(m.o3).toBeNull();
  });

  test('returns null on bad input', () => {
    expect(normalizeOpenAqLatest('s', null, results)).toBeNull();
    expect(normalizeOpenAqLatest('s', SENSORS, null)).toBeNull();
    expect(normalizeOpenAqLatest('s', SENSORS, [])).toBeNull();
  });
});

describe('US EPA scale (non-India stations)', () => {
  test('picks the standard by country (India -> CPCB, others -> US_EPA)', () => {
    expect(standardForCountry('IN')).toBe('CPCB');
    expect(standardForCountry('US')).toBe('US_EPA');
    expect(standardForCountry(null)).toBe('US_EPA');
  });

  test('EPA categories and levels', () => {
    expect(categoryForAQI(40, 'US_EPA')).toBe('Good');
    expect(categoryForAQI(75, 'US_EPA')).toBe('Moderate');
    expect(categoryForAQI(130, 'US_EPA')).toBe('Unhealthy for Sensitive Groups');
    expect(categoryForAQI(180, 'US_EPA')).toBe('Unhealthy');
    expect(categoryForAQI(250, 'US_EPA')).toBe('Very Unhealthy');
    expect(categoryForAQI(400, 'US_EPA')).toBe('Hazardous');
    expect(levelForAQI(130, 'US_EPA')).toBe(3);
    expect(levelForAQI(130, 'CPCB')).toBe(3); // 101-200 is Moderate on the CPCB scale
    expect(levelForAQI(75, 'CPCB')).toBe(2);
  });

  test('EPA PM2.5 sub-index (2024 breakpoints)', () => {
    expect(subIndex('pm25', 9, 'US_EPA')).toBe(50);
    expect(subIndex('pm25', 35.4, 'US_EPA')).toBe(100);
    expect(subIndex('pm25', 45, 'US_EPA')).toBe(124);
    expect(subIndex('pm25', 999, 'US_EPA')).toBe(500);
  });

  test('same PM2.5 gives a different AQI on each scale', () => {
    expect(subIndex('pm25', 45, 'CPCB')).toBe(75);
    expect(subIndex('pm25', 45, 'US_EPA')).toBe(124);
  });

  test('gases are converted to EPA units (ppb / ppm)', () => {
    expect(subIndex('no2', 100, 'US_EPA')).toBeGreaterThan(30); // ~53 ppb -> ~50
    expect(subIndex('no2', 100, 'US_EPA')).toBeLessThan(60);
    expect(subIndex('o3', 100, 'US_EPA')).toBeGreaterThan(40);
    expect(subIndex('o3', 100, 'US_EPA')).toBeLessThan(60);
  });

  test('normalizeOpenAqLatest labels the reading with the standard and level', () => {
    const results = [{ sensorsId: 1, value: 45, datetime: { utc: iso(10) } }];
    const m = normalizeOpenAqLatest('s', SENSORS, results, { now: NOW, standard: 'US_EPA' });
    expect(m.standard).toBe('US_EPA');
    expect(m.aqi).toBe(124);
    expect(m.category).toBe('Unhealthy for Sensitive Groups');
    expect(m.level).toBe(3);
    const cpcb = normalizeOpenAqLatest('s', SENSORS, results, { now: NOW, standard: 'CPCB' });
    expect(cpcb.standard).toBe('CPCB');
    expect(cpcb.level).toBe(2);
  });
});
