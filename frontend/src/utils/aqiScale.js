/**
 * AQI scales used by the app. Both have six levels (1 = Good ... 6 = worst) so colors,
 * badges and advisories work from the level, while labels / ranges come from the scale.
 *
 *  - CPCB   : Indian National AQI (stations in India)
 *  - US_EPA : US EPA AQI (every other country)
 */
export const LEVEL_COLORS = {
  1: '#16a34a',
  2: '#d97706',
  3: '#ea580c',
  4: '#dc2626',
  5: '#9333ea',
  6: '#881337',
};

export const SCALES = {
  CPCB: {
    name: 'Indian CPCB AQI',
    short: 'CPCB',
    where: 'India',
    bands: [
      { level: 1, label: 'Good', range: '0–50', desc: 'Minimal impact.' },
      { level: 2, label: 'Satisfactory', range: '51–100', desc: 'Minor breathing discomfort to sensitive people.' },
      { level: 3, label: 'Moderate', range: '101–200', desc: 'Breathing discomfort to people with lungs, asthma and heart diseases.' },
      { level: 4, label: 'Poor', range: '201–300', desc: 'Breathing discomfort to most people on prolonged exposure.' },
      { level: 5, label: 'Very Poor', range: '301–400', desc: 'Respiratory illness on prolonged exposure. Pronounced effects for sensitive groups.' },
      { level: 6, label: 'Severe', range: '401–500', desc: 'Affects healthy people and seriously impacts those with existing diseases.' },
    ],
  },
  US_EPA: {
    name: 'US EPA AQI',
    short: 'US EPA',
    where: 'rest of the world',
    bands: [
      { level: 1, label: 'Good', range: '0–50', desc: 'Air quality is satisfactory and poses little or no risk.' },
      { level: 2, label: 'Moderate', range: '51–100', desc: 'Acceptable, but unusually sensitive people may notice effects.' },
      { level: 3, label: 'Unhealthy for Sensitive Groups', range: '101–150', desc: 'Children, older adults and people with lung or heart disease may be affected.' },
      { level: 4, label: 'Unhealthy', range: '151–200', desc: 'Everyone may begin to experience health effects; sensitive groups more serious ones.' },
      { level: 5, label: 'Very Unhealthy', range: '201–300', desc: 'Health alert: everyone may experience more serious health effects.' },
      { level: 6, label: 'Hazardous', range: '301–500', desc: 'Emergency conditions: the whole population is likely to be affected.' },
    ],
  },
};

// Old CPCB category names -> level (fallback for readings saved before levels existed)
const CPCB_NAME_LEVEL = { Good: 1, Satisfactory: 2, Moderate: 3, Poor: 4, 'Very Poor': 5, Severe: 6 };

export function standardOf(reading) {
  return reading?.standard && SCALES[reading.standard] ? reading.standard : 'CPCB';
}

/** Level 1-6 of a reading (or null). */
export function levelOf(reading) {
  if (!reading) return null;
  if (reading.level) return reading.level;
  return CPCB_NAME_LEVEL[reading.category] || null;
}

export function colorOf(reading, fallback = 'var(--green-primary)') {
  const lvl = levelOf(reading);
  return lvl ? LEVEL_COLORS[lvl] : fallback;
}

export function bandOf(reading) {
  const lvl = levelOf(reading);
  if (!lvl) return null;
  return SCALES[standardOf(reading)].bands[lvl - 1];
}

/** Station filter options shared by the Dashboard and the Stations page. */
export const LEVEL_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'GOOD', label: 'Good' },
  { key: 'MODERATE', label: 'Moderate' },
  { key: 'POOR_PLUS', label: 'Unhealthy & above' },
];

export function matchesLevelFilter(filter, reading) {
  if (filter === 'ALL') return true;
  const lvl = levelOf(reading);
  if (!lvl) return false;
  if (filter === 'GOOD') return lvl === 1;
  if (filter === 'MODERATE') return lvl === 2 || lvl === 3;
  if (filter === 'POOR_PLUS') return lvl >= 4;
  return true;
}

/** "Chennai, India" - skips empty parts and duplicates (city often equals the country). */
export function placeLabel(station) {
  if (!station) return '';
  const parts = [station.city, station.state, station.country].filter(Boolean);
  return parts.filter((p, i) => parts.indexOf(p) === i).join(', ');
}

export function countriesOf(stations) {
  return Array.from(new Set(stations.map((s) => s.country).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}
