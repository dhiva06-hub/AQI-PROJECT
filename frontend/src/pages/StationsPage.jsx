import { useState, useMemo } from 'react';
import { useAQI } from '../hooks/useAQI';
import SearchBar from '../components/SearchBar';
import StationCard from '../components/StationCard';
import StationComparator from '../components/StationComparator';
import { IconSliders } from '../components/Icons';
import RegionSelect from '../components/RegionSelect';
import { countriesOf, matchesLevelFilter, LEVEL_FILTERS } from '../utils/aqiScale';

export default function StationsPage() {
  const { readings, stationsMeta, loading, error } = useAQI();
  const [query, setQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [filter, setFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(40);

  const stations = useMemo(() => Object.values(stationsMeta), [stationsMeta]);

  const countries = useMemo(() => countriesOf(stations), [stations]);

  // Reset pagination on filter change
  const handleFilterChange = (cat) => {
    setFilter(cat);
    setVisibleCount(40);
  };

  const filtered = useMemo(() => {
    return stations.filter((s) => {
      const matchQuery =
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.city.toLowerCase().includes(query.toLowerCase()) ||
        (s.country || '').toLowerCase().includes(query.toLowerCase());
      const matchCity = selectedCity === 'ALL' || s.country === selectedCity;
      const r = readings[s.stationId];
      if (!matchQuery || !matchCity) return false;
      return matchesLevelFilter(filter, r);
    });
  }, [stations, query, selectedCity, filter, readings]);

  if (error) return <div className="error-box" role="alert">Failed to load stations: {error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section className="page-header-wrap">
        <div>
          <div className="page-badge-pill">
            <span className="pulse-indicator-dot" />
            <span>Telemetry Station Directory · Global Fleet</span>
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="card-icon-badge">
              <IconSliders size={18} />
            </span>
            <span>Monitoring Stations Directory</span>
          </h1>
          <p className="page-subtitle">
            Search, filter, and compare verified OpenAQ air quality monitoring stations worldwide. Inspect pollutant thresholds and telemetry metrics in real time.
          </p>
        </div>
      </section>

      <RegionSelect
        value={selectedCity}
        onChange={(c) => {
          setSelectedCity(c);
          setVisibleCount(40);
        }}
        countries={countries}
        stationCount={stations.length}
      />

      <div className="grid grid-cols-2">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', background: 'var(--panel-2)' }}>
            <div style={{ marginBottom: 12 }}>
              <SearchBar
                value={query}
                onChange={(q) => {
                  setQuery(q);
                  setVisibleCount(40);
                }}
                placeholder="Filter by station name, city, or country..."
              />
            </div>

            <div className="filter-pill-group">
              {LEVEL_FILTERS.map(({ key: cat, label }) => (
                <button
                  key={cat}
                  type="button"
                  className={`filter-pill-btn ${filter === cat ? 'active' : ''}`}
                  onClick={() => handleFilterChange(cat)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '10px' }}>
            {loading ? (
              <div className="skeleton" style={{ height: 320, margin: 10 }} />
            ) : filtered.length === 0 ? (
              <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-dim)' }}>
                No monitoring stations match your search criteria.
              </div>
            ) : (
              <>
                {filtered.slice(0, visibleCount).map((station) => (
                  <StationCard
                    key={station.stationId}
                    station={station}
                    latest={readings[station.stationId]}
                  />
                ))}
                {filtered.length > visibleCount && (
                  <div style={{ textAlign: 'center', padding: '14px' }}>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => setVisibleCount((prev) => prev + 40)}
                    >
                      Load More Stations ({filtered.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div>
          <StationComparator stations={stations} readings={readings} />
        </div>
      </div>
    </div>
  );
}
