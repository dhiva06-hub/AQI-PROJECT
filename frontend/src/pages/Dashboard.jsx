import { useState, useMemo, useEffect } from 'react';
import { useAQI } from '../hooks/useAQI';
import { AirQualityAPI } from '../services/api';
import AQICard from '../components/AQICard';
import PollutantCard from '../components/PollutantCard';
import AQIMap from '../components/AQIMap';
import AQILegend from '../components/AQILegend';
import AQIChart from '../components/AQIChart';
import StationCard from '../components/StationCard';
import SearchBar from '../components/SearchBar';
import RegionSelect from '../components/RegionSelect';
import { levelOf, matchesLevelFilter, LEVEL_FILTERS, countriesOf } from '../utils/aqiScale';
import HealthAdvisory from '../components/HealthAdvisory';
import StationComparator from '../components/StationComparator';
import {
  IconMap,
  IconTrendingUp,
  IconSliders,
  IconWind,
  IconDownload,
  IconRefreshCw,
} from '../components/Icons';

const POLLUTANT_KEYS = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'];

const RANGES = [
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
];

export default function Dashboard() {
  const { readings, stationsMeta, loading, error, connectionStatus, refetch } = useAQI();
  const stationIds = Object.keys(stationsMeta);
  const stationsList = Object.values(stationsMeta);

  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedId, setSelectedId] = useState(null);
  const [stationQuery, setStationQuery] = useState('');
  const [stationCategoryFilter, setStationCategoryFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(30);

  // Dynamic on-demand lookup state for unmonitored areas
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);

  // History state for embedded trend chart
  const [historyRange, setHistoryRange] = useState('24h');
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Reset pagination when filter criteria change
  useEffect(() => {
    setVisibleCount(30);
  }, [selectedCity, stationQuery, stationCategoryFilter]);

  // Countries that have at least one station
  const countries = useMemo(() => countriesOf(Object.values(stationsMeta)), [stationsMeta]);

  // Filter stations based on the selected country
  const cityFilteredStations = useMemo(() => {
    if (selectedCity === 'ALL') return stationsList;
    return stationsList.filter((s) => s.country === selectedCity);
  }, [stationsList, selectedCity]);

  // Active station selection - prefers station with available real AQI data
  const activeId = useMemo(() => {
    if (selectedId && stationsMeta[selectedId]) {
      if (selectedCity === 'ALL' || stationsMeta[selectedId]?.country === selectedCity) {
        return selectedId;
      }
    }
    const withReading = cityFilteredStations.find(
      (s) => readings[s.stationId]?.aqi !== null && readings[s.stationId]?.aqi !== undefined
    );
    return withReading?.stationId || cityFilteredStations[0]?.stationId || stationIds[0] || null;
  }, [selectedId, stationsMeta, cityFilteredStations, stationIds, selectedCity, readings]);

  const activeStation = stationsMeta[activeId];
  const activeLatest = readings[activeId];

  // Fetch history when active station or range changes
  useEffect(() => {
    if (!activeId) return;
    setHistoryLoading(true);
    AirQualityAPI.getHistory(activeId, historyRange)
      .then((res) => setHistoryData(res.data || []))
      .catch((err) => console.error('Failed to load history for dashboard:', err))
      .finally(() => setHistoryLoading(false));
  }, [activeId, historyRange]);

  // Overall Statistics for current selection
  const { avgAqi, worstStation, bestStation, monitoredStationCount } = useMemo(() => {
    let totalAqi = 0;
    let count = 0;
    let worst = null;
    let best = null;

    const listToEvaluate = cityFilteredStations.length ? cityFilteredStations : stationsList;

    for (const s of listToEvaluate) {
      const r = readings[s.stationId];
      if (r && typeof r.aqi === 'number') {
        totalAqi += r.aqi;
        count++;
        if (!worst || r.aqi > worst.aqi) worst = { ...r, stationName: s.name, city: s.city };
        if (!best || r.aqi < best.aqi) best = { ...r, stationName: s.name, city: s.city };
      }
    }

    return {
      avgAqi: count > 0 ? Math.round(totalAqi / count) : 0,
      worstStation: worst,
      bestStation: best,
      monitoredStationCount: count,
    };
  }, [readings, cityFilteredStations, stationsList]);

  // Filtered stations for search & categories
  const filteredStations = useMemo(() => {
    return cityFilteredStations.filter((s) => {
      const matchesQuery =
        s.name.toLowerCase().includes(stationQuery.toLowerCase()) ||
        s.city.toLowerCase().includes(stationQuery.toLowerCase()) ||
        (s.country || '').toLowerCase().includes(stationQuery.toLowerCase());
      const r = readings[s.stationId];
      if (!matchesQuery) return false;
      return matchesLevelFilter(stationCategoryFilter, r);
    });
  }, [cityFilteredStations, stationQuery, stationCategoryFilter, readings]);

  // Dynamic live search for station via OpenAQ API
  const handleCustomAreaLookup = (queryText) => {
    const q = (queryText || stationQuery).trim();
    if (!q) return;

    setLookupLoading(true);
    setLookupError(null);
    AirQualityAPI.lookupLocation(q)
      .then((res) => {
        if (res.data) {
          setLookupResult(res.data);
        } else {
          setLookupError(`No live OpenAQ station found for "${q}".`);
        }
      })
      .catch((err) => {
        setLookupError(err.response?.data?.message || `Unable to fetch live AQI for "${q}".`);
      })
      .finally(() => setLookupLoading(false));
  };

  // Export current data as CSV
  const handleExportCSV = () => {
    if (!stationsList.length) return;
    const headers = [
      'Station ID',
      'Station Name',
      'City',
      'State',
      'Latitude',
      'Longitude',
      'AQI',
      'Category',
      'PM2.5',
      'PM10',
      'NO2',
      'SO2',
      'CO',
      'O3',
      'Source',
      'Timestamp',
    ];
    const rows = stationsList.map((s) => {
      const r = readings[s.stationId] || {};
      return [
        s.stationId,
        `"${s.name}"`,
        s.city,
        s.state || '',
        s.latitude,
        s.longitude,
        r.aqi ?? '',
        r.category ?? '',
        r.pm25 ?? '',
        r.pm10 ?? '',
        r.no2 ?? '',
        r.so2 ?? '',
        r.co ?? '',
        r.o3 ?? '',
        r.source ?? 'openaq',
        r.sourceTimestamp ? new Date(r.sourceTimestamp).toISOString() : '',
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `realtime_aqi_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return (
      <div className="error-box" role="alert">
        <strong>Connection Notice:</strong> {error}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Monitored Cities Navigation Ribbon */}
      <section aria-label="Country selector">
        <RegionSelect
          value={selectedCity}
          onChange={(c) => {
            setSelectedCity(c);
            const first = c === 'ALL' ? null : stationsList.find((st) => st.country === c);
            setSelectedId(first ? first.stationId : null);
          }}
          countries={countries}
          stationCount={stationsList.length}
        />
      </section>

      {/* Main Page Title Header */}
      <section className="page-header-wrap">
        <div>
          <div className="page-badge-pill">
            <span className="pulse-indicator-dot" />
            <span>Global Air Quality Network · Real-Time Telemetry</span>
          </div>
          <h1 className="page-title">
            {selectedCity === 'ALL' ? 'Global Environmental Intelligence Dashboard' : `${selectedCity} Air Quality Dashboard`}
          </h1>
          <p className="page-subtitle">
            Continuous real-time air quality index monitoring from OpenAQ sensor stations worldwide. Calculated with national standards: Indian CPCB scale for India and US EPA scale globally.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={handleExportCSV} className="btn-secondary btn-sm" title="Export readings to CSV">
            <IconDownload size={14} />
            <span>Export CSV</span>
          </button>
          <button type="button" onClick={() => refetch()} className="btn-secondary btn-sm" title="Refresh data">
            <IconRefreshCw size={14} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </section>

      {/* Search Bar */}
      <section>
        <SearchBar
          value={stationQuery}
          onChange={(val) => {
            setStationQuery(val);
            if (!val) setLookupResult(null);
          }}
          onSearch={handleCustomAreaLookup}
          placeholder="Search station, city or any location worldwide (e.g. London, Delhi, Los Angeles)..."
          isLoading={lookupLoading}
        />
      </section>

      {/* Live Custom Lookup Result */}
      {lookupResult && (
        <section className="card" style={{ border: '1px solid var(--emerald-border)', background: 'var(--panel)', padding: '20px', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-emerald">
                  OpenAQ Live Query
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                  {lookupResult.location.name}
                </h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 3 }}>
                Verified OpenAQ sensor telemetry for coordinates: {lookupResult.location.latitude?.toFixed(3)}°N, {lookupResult.location.longitude?.toFixed(3)}°E
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setLookupResult(null)}
            >
              ✕ Dismiss
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            <div className="card" style={{ padding: '12px', textAlign: 'center', borderTop: '3px solid var(--forest-primary)', background: 'var(--panel-2)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>AQI INDEX</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-heading)', marginTop: 2 }}>
                {lookupResult.latest.aqi}
              </div>
              <span className={`badge badge-L${levelOf(lookupResult.latest)}`} style={{ marginTop: 4 }}>
                {lookupResult.latest.category}
              </span>
            </div>

            <div className="card" style={{ padding: '12px', textAlign: 'center', background: 'var(--panel-2)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>PM2.5</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 2, color: 'var(--text-heading)' }}>
                {lookupResult.latest.pm25 !== null ? lookupResult.latest.pm25 : 'N/A'} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>µg/m³</span>
              </div>
            </div>

            <div className="card" style={{ padding: '12px', textAlign: 'center', background: 'var(--panel-2)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>PM10</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 2, color: 'var(--text-heading)' }}>
                {lookupResult.latest.pm10 !== null ? lookupResult.latest.pm10 : 'N/A'} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>µg/m³</span>
              </div>
            </div>

            <div className="card" style={{ padding: '12px', textAlign: 'center', background: 'var(--panel-2)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>NO2</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 2, color: 'var(--text-heading)' }}>
                {lookupResult.latest.no2 !== null ? lookupResult.latest.no2 : 'N/A'} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>µg/m³</span>
              </div>
            </div>

            <div className="card" style={{ padding: '12px', textAlign: 'center', background: 'var(--panel-2)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>SO2</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 2, color: 'var(--text-heading)' }}>
                {lookupResult.latest.so2 !== null ? lookupResult.latest.so2 : 'N/A'} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>µg/m³</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* KPI Summary Cards */}
      <section className="grid grid-cols-4" aria-label="Air Quality Summary Cards">
        <div className="kpi-card" style={{ borderTop: '3px solid var(--forest-primary)' }}>
          <div className="kpi-label">
            <span>{selectedCity === 'ALL' ? 'Global Average AQI' : `${selectedCity} Average AQI`}</span>
          </div>
          <div className="kpi-value" style={{ color: 'var(--forest-primary)' }}>
            {avgAqi || '—'}
          </div>
          <div className="kpi-subtext">
            <span>Across {monitoredStationCount} active stations</span>
          </div>
        </div>

        <div className="kpi-card" style={{ borderTop: '3px solid var(--cpcb-good)' }}>
          <div className="kpi-label">
            <span>Cleanest Monitored Station</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--cpcb-good)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={bestStation ? bestStation.stationName : ''}>
            {bestStation ? bestStation.stationName : 'Data pending'}
          </div>
          <div className="kpi-subtext" style={{ marginTop: 4 }}>
            <span>AQI {bestStation ? bestStation.aqi : '—'} {bestStation ? `(${bestStation.city})` : ''}</span>
          </div>
        </div>

        <div className="kpi-card" style={{ borderTop: '3px solid var(--cpcb-poor)' }}>
          <div className="kpi-label">
            <span>Highest Pollution Peak</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--cpcb-poor)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={worstStation ? worstStation.stationName : ''}>
            {worstStation ? worstStation.stationName : 'Data pending'}
          </div>
          <div className="kpi-subtext" style={{ marginTop: 4 }}>
            <span>AQI {worstStation ? worstStation.aqi : '—'} {worstStation ? `(${worstStation.city})` : ''}</span>
          </div>
        </div>

        <div className="kpi-card" style={{ borderTop: '3px solid var(--emerald)' }}>
          <div className="kpi-label">
            <span>Live Data Ingestion</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
            <span className="pulse-indicator-dot" />
            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-heading)' }}>OpenAQ v3 Feed</span>
          </div>
          <div className="kpi-subtext">
            <span>Automated real-time background sync</span>
          </div>
        </div>
      </section>

      {/* Hero Grid: Selected Station Overview & Health Advisory */}
      <section className="hero-dashboard-grid" aria-label="Active Station Overview">
        {activeStation && activeLatest ? (
          <AQICard
            station={activeStation}
            latest={activeLatest}
            connectionStatus={connectionStatus}
          />
        ) : (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280, color: 'var(--text-dim)' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: 600 }}>Real-time AQI data unavailable for selected station</p>
              <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Please select another active station from the directory below.</p>
            </div>
          </div>
        )}

        <HealthAdvisory
          category={activeLatest?.category}
          level={activeLatest?.level}
          standard={activeLatest?.standard}
          aqi={activeLatest?.aqi}
        />
      </section>

      {/* Pollutant Breakdown Cards */}
      <section aria-label="Individual Pollutant Concentration Cards">
        <div className="section-header" style={{ marginTop: 8 }}>
          <div className="section-title-wrap">
            <h2>
              <span className="card-icon-badge">
                <IconWind size={16} />
              </span>
              <span>Pollutant Concentration Breakdown</span>
            </h2>
            <p>
              Real-time pollutant parameters for <strong>{activeStation?.name || 'Selected Station'}</strong> ({activeStation?.city || ''})
            </p>
          </div>
        </div>

        <div className="grid grid-cols-6">
          {POLLUTANT_KEYS.map((key) => (
            <PollutantCard
              key={key}
              pollutantKey={key}
              value={activeLatest ? activeLatest[key] : null}
            />
          ))}
        </div>
      </section>

      {/* Embedded Historical Trend Chart */}
      <section aria-label="Historical Air Quality Trends">
        <div className="section-header">
          <div className="section-title-wrap">
            <h2>
              <span className="card-icon-badge">
                <IconTrendingUp size={16} />
              </span>
              <span>Historical Air Quality Trends</span>
            </h2>
            <p>Stored timeseries telemetry for {activeStation?.name || 'Selected Station'}</p>
          </div>

          <div className="filter-pill-group">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                className={`filter-pill-btn ${historyRange === r.value ? 'active' : ''}`}
                onClick={() => setHistoryRange(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '20px 16px' }}>
          {historyLoading ? (
            <div className="skeleton" style={{ height: 280 }} />
          ) : (
            <AQIChart data={historyData} range={historyRange} />
          )}
        </div>
      </section>

      {/* Live Geospatial Map */}
      <section aria-label="Live Geographic Map">
        <div className="section-header">
          <div className="section-title-wrap">
            <h2>
              <span className="card-icon-badge">
                <IconMap size={16} />
              </span>
              <span>Live Geographic Station Map</span>
            </h2>
            <p>Real-time OpenAQ monitoring stations on OpenStreetMap</p>
          </div>
        </div>

        <div className="card" style={{ padding: 12 }}>
          <AQIMap
            stations={filteredStations}
            readings={readings}
            selectedStationId={activeId}
            onSelectStation={(stId) => setSelectedId(stId)}
          />
          <div style={{ marginTop: 12 }}>
            <AQILegend />
          </div>
        </div>
      </section>

      {/* Station Directory */}
      <section aria-label="Station Directory">
        <div className="section-header">
          <div className="section-title-wrap">
            <h2>
              <span className="card-icon-badge">
                <IconSliders size={16} />
              </span>
              <span>Monitoring Stations Directory ({filteredStations.length})</span>
            </h2>
            <p>Click any station to inspect its real-time telemetry</p>
          </div>

          <div className="filter-pill-group">
            {LEVEL_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`filter-pill-btn ${stationCategoryFilter === key ? 'active' : ''}`}
                onClick={() => setStationCategoryFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2">
          {filteredStations.slice(0, visibleCount).map((station) => (
            <StationCard
              key={station.stationId}
              station={station}
              latest={readings[station.stationId]}
              isSelected={activeId === station.stationId}
              onSelect={(stId) => setSelectedId(stId)}
            />
          ))}
        </div>

        {filteredStations.length > visibleCount && (
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setVisibleCount((prev) => prev + 30)}
            >
              Load More Stations ({filteredStations.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </section>

      {/* Station Comparison */}
      <StationComparator stations={stationsList} readings={readings} />
    </div>
  );
}
