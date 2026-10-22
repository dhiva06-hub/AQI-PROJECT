import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AirQualityAPI, StationAPI } from '../services/api';
import AQIChart from '../components/AQIChart';
import { IconTrendingUp, IconDownload } from '../components/Icons';

const RANGES = [
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
];

export default function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stations, setStations] = useState([]);
  const [stationId, setStationId] = useState(searchParams.get('stationId') || '');
  const [range, setRange] = useState('24h');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    StationAPI.list()
      .then((res) => {
        setStations(res.data || []);
        if (!stationId && res.data && res.data.length > 0) {
          setStationId(res.data[0].stationId);
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!stationId) return;
    setLoading(true);
    setSearchParams({ stationId });
    AirQualityAPI.getHistory(stationId, range)
      .then((res) => {
        setData(res.data || []);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [stationId, range]);

  const activeStation = stations.find((s) => s.stationId === stationId);

  // Export historical data to CSV
  const handleExportHistoryCSV = () => {
    if (!data.length) return;
    const headers = ['Timestamp', 'Station ID', 'AQI', 'Category', 'PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3', 'Source'];
    const rows = data.map((d) => [
      d.sourceTimestamp ? new Date(d.sourceTimestamp).toISOString() : '',
      stationId,
      d.aqi ?? '',
      d.category ?? '',
      d.pm25 ?? '',
      d.pm10 ?? '',
      d.no2 ?? '',
      d.so2 ?? '',
      d.co ?? '',
      d.o3 ?? '',
      d.source ?? 'openaq',
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${stationId}_history_${range}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section className="page-header-wrap">
        <div>
          <div className="page-badge-pill">
            <span className="pulse-indicator-dot" />
            <span>Timeseries Analytics · Environmental Telemetry</span>
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="card-icon-badge">
              <IconTrendingUp size={18} />
            </span>
            <span>Historical Air Quality Analytics</span>
          </h1>
          <p className="page-subtitle">
            Timeseries measurements stored in MongoDB Atlas for {activeStation ? `${activeStation.name} (${activeStation.city})` : stationId || 'the selected station'}. Track longitudinal shifts in AQI and particulate densities.
          </p>
        </div>

        {data.length > 0 && (
          <button type="button" onClick={handleExportHistoryCSV} className="btn-secondary btn-sm">
            <IconDownload size={14} />
            <span>Export Timeseries CSV</span>
          </button>
        )}
      </section>

      <div className="card" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label htmlFor="history-station-select" style={{ fontSize: '0.78rem', color: 'var(--text-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Station:
          </label>
          <select
            id="history-station-select"
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            style={{ minWidth: 280, fontWeight: 600, height: 40, borderRadius: 8 }}
          >
            {stations.map((s) => (
              <option key={s.stationId} value={s.stationId}>
                {s.name} ({s.city})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Time Window:
          </span>
          <div className="filter-pill-group">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                className={`filter-pill-btn ${range === r.value ? 'active' : ''}`}
                onClick={() => setRange(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="error-box" role="alert">{error}</div>}

      <div className="card" style={{ padding: '22px 18px' }}>
        {loading ? (
          <div className="skeleton" style={{ height: 340 }} />
        ) : data.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-dim)' }}>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-heading)' }}>No historical telemetry recorded yet for this station in the {range} window.</p>
            <p style={{ fontSize: '0.84rem', marginTop: 6, color: 'var(--text-muted)' }}>Timeseries readings are recorded continuously as automated OpenAQ ingestion polls run in the background.</p>
          </div>
        ) : (
          <AQIChart data={data} range={range} />
        )}
      </div>
    </div>
  );
}
