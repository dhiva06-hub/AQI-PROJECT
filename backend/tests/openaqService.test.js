/**
 * Tests the OpenAQ client against mocked HTTP responses (no network, no real key).
 */
jest.mock('axios');
const axios = require('axios');

process.env.OPENAQ_API_KEY = 'test-key';
process.env.OPENAQ_MIN_INTERVAL_MS = '0'; // no pacing delay in tests
const { discoverStations, fetchStationReading } = require('../services/externalAPIService');

const recent = () => new Date(Date.now() - 20 * 60000).toISOString();
const loc = (id, name, code, country, extra = {}) => ({
  id, name, isMobile: false, isMonitor: false,
  coordinates: { latitude: 10 + id / 100, longitude: 20 },
  country: { code, name: country },
  datetimeLast: { utc: recent() },
  sensors: [
    { id: id * 10 + 1, parameter: { name: 'pm25', units: 'µg/m³' } },
    { id: id * 10 + 2, parameter: { name: 'no2', units: 'ppb' } },
    { id: id * 10 + 3, parameter: { name: 'temperature', units: 'c' } },
  ],
  ...extra,
});

const COUNTRIES = { results: [{ id: 1, code: 'IN', name: 'India' }, { id: 2, code: 'US', name: 'United States' }, { id: 3, code: 'AQ', name: 'Nowhere' }] };
const LOCATIONS_BY_COUNTRY = {
  1: { results: [loc(101, 'Alandur', 'IN', 'India', { locality: 'Chennai' }), loc(102, 'Anand Vihar', 'IN', 'India', { locality: 'Delhi', isMonitor: true })] },
  2: { results: [
    loc(201, 'Downtown', 'US', 'United States', { locality: 'Boston', isMonitor: true }),
    { ...loc(202, 'Gas only', 'US', 'United States'), sensors: [{ id: 9, parameter: { name: 'o3', units: 'ppb' } }] }, // no PM -> out
    { ...loc(203, 'Old', 'US', 'United States'), datetimeLast: { utc: '2020-01-01T00:00:00Z' } }, // stale -> out
    { ...loc(204, 'Mobile', 'US', 'United States'), isMobile: true }, // mobile -> out
  ] },
  3: { results: [] },
};

function mockOpenAq() {
  axios.get.mockImplementation(async (url, cfg) => {
    if (url.endsWith('/countries')) return { data: COUNTRIES };
    if (url.endsWith('/locations')) return { data: LOCATIONS_BY_COUNTRY[cfg.params.countries_id] };
    throw new Error(`unexpected url ${url}`);
  });
}

describe('OpenAQ client', () => {
  beforeEach(() => {
    axios.get.mockReset();
    delete process.env.OPENAQ_COUNTRIES;
  });

  test('discoverStations works worldwide, filters bad locations and sends the API key', async () => {
    mockOpenAq();
    const stations = await discoverStations({ perCountry: 3, max: 50 });
    const ids = stations.map((s) => s.stationId).sort();
    expect(ids).toEqual(['openaq-101', 'openaq-102', 'openaq-201']);

    const us = stations.find((s) => s.stationId === 'openaq-201');
    expect(us.country).toBe('United States');
    expect(us.countryCode).toBe('US');
    expect(us.city).toBe('Boston');
    expect(us.sensors).toEqual([
      { sensorId: 2011, parameter: 'pm25', units: 'µg/m³' },
      { sensorId: 2012, parameter: 'no2', units: 'ppb' },
    ]);
    expect(axios.get.mock.calls[0][1].headers['X-API-Key']).toBe('test-key');
  });

  test('prefers reference-grade monitors and different localities within a country', async () => {
    mockOpenAq();
    const stations = await discoverStations({ perCountry: 1, max: 50 });
    const india = stations.find((s) => s.countryCode === 'IN');
    expect(india.stationId).toBe('openaq-102'); // isMonitor wins
  });

  test('the overall cap interleaves countries (rank 1 of each country first)', async () => {
    mockOpenAq();
    const stations = await discoverStations({ perCountry: 3, max: 2 });
    expect(stations.map((s) => s.countryCode).sort()).toEqual(['IN', 'US']);
  });

  test('OPENAQ_COUNTRIES limits discovery to the listed countries', async () => {
    process.env.OPENAQ_COUNTRIES = 'US';
    mockOpenAq();
    const stations = await discoverStations({ perCountry: 3, max: 50 });
    expect(stations.every((s) => s.countryCode === 'US')).toBe(true);
  });

  test('fetchStationReading uses CPCB for India and US EPA elsewhere', async () => {
    axios.get.mockResolvedValue({
      data: { results: [{ sensorsId: 1, value: 45, datetime: { utc: recent() } }] },
    });
    const sensors = [{ sensorId: 1, parameter: 'pm25', units: 'µg/m³' }];

    const india = await fetchStationReading({ stationId: 'openaq-1', externalUid: '1', countryCode: 'IN', sensors });
    expect(axios.get.mock.calls[0][0]).toContain('/locations/1/latest');
    expect(india.standard).toBe('CPCB');
    expect(india.aqi).toBe(75);

    const us = await fetchStationReading({ stationId: 'openaq-2', externalUid: '2', countryCode: 'US', sensors });
    expect(us.standard).toBe('US_EPA');
    expect(us.aqi).toBe(124);
    expect(us.source).toBe('openaq');
  });

  test('returns null (no fake data) when OpenAQ errors out', async () => {
    axios.get.mockRejectedValue({ response: { status: 401 } });
    const reading = await fetchStationReading({ stationId: 'x', externalUid: '1', sensors: [{ sensorId: 1, parameter: 'pm25', units: 'µg/m³' }] });
    expect(reading).toBeNull();
  });
});
