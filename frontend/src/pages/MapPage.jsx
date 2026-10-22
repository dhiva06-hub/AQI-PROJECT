import { useState, useMemo } from 'react';
import { useAQI } from '../hooks/useAQI';
import AQIMap from '../components/AQIMap';
import AQILegend from '../components/AQILegend';
import StationCard from '../components/StationCard';
import RegionSelect from '../components/RegionSelect';
import { countriesOf } from '../utils/aqiScale';
import { IconMap } from '../components/Icons';

export default function MapPage() {
  const { readings, stationsMeta, loading, error } = useAQI();
  const stations = Object.values(stationsMeta);
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(30);

  const countries = useMemo(() => countriesOf(stations), [stations]);

  const filteredStations = useMemo(() => {
    if (selectedCity === 'ALL') return stations;
    return stations.filter((s) => s.country === selectedCity);
  }, [stations, selectedCity]);

  if (error) return <div className="error-box" role="alert">Failed to load map data: {error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section className="page-header-wrap">
        <div>
          <div className="page-badge-pill">
            <span className="pulse-indicator-dot" />
            <span>Geospatial Intelligence · Sensor Mapping</span>
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="card-icon-badge">
              <IconMap size={18} />
            </span>
            <span>Real-Time Geospatial Station Map</span>
          </h1>
          <p className="page-subtitle">
            Interactive Leaflet map powered by OpenStreetMap tiles. Markers show verified OpenAQ station locations worldwide, color-coded by AQI severity (Indian CPCB standard for India, US EPA standard globally).
          </p>
        </div>
      </section>

      <RegionSelect
        value={selectedCity}
        onChange={(c) => {
          setSelectedCity(c);
          setVisibleCount(30);
        }}
        countries={countries}
        stationCount={stations.length}
      />

      <div style={{ marginBottom: 2 }}>
        <AQILegend />
      </div>

      <div className="grid grid-cols-2" style={{ gridTemplateColumns: '1.45fr 0.55fr', alignItems: 'start' }}>
        <div className="card" style={{ padding: 12 }}>
          {loading ? (
            <div className="skeleton" style={{ height: 480 }} />
          ) : (
            <AQIMap
              stations={filteredStations}
              readings={readings}
              selectedStationId={selectedStationId}
              onSelectStation={setSelectedStationId}
            />
          )}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--border)',
              fontWeight: 700,
              fontSize: '0.88rem',
              color: 'var(--text-heading)',
              background: 'var(--panel-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Station Directory</span>
            <span className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>
              {filteredStations.length} stations
            </span>
          </div>
          <div style={{ maxHeight: 480, overflowY: 'auto', padding: '10px' }}>
            {filteredStations.slice(0, visibleCount).map((station) => (
              <StationCard
                key={station.stationId}
                station={station}
                latest={readings[station.stationId]}
                isSelected={station.stationId === selectedStationId}
                onSelect={setSelectedStationId}
              />
            ))}
            {filteredStations.length > visibleCount && (
              <div style={{ textAlign: 'center', padding: '12px' }}>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => setVisibleCount((prev) => prev + 30)}
                >
                  Load More ({filteredStations.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
