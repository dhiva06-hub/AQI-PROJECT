import { CircleMarker, Popup } from 'react-leaflet';
import { CategoryBadge } from './AQICard';
import { colorOf, levelOf, placeLabel } from '../utils/aqiScale';

export default function StationMarker({ station, latest, isSelected, onSelect }) {
  const color = latest ? colorOf(latest, '#15803d') : '#8c7664';

  return (
    <CircleMarker
      center={[station.latitude, station.longitude]}
      radius={isSelected ? 14 : 10}
      pathOptions={{
        color: isSelected ? '#2d1f18' : color,
        fillColor: color,
        fillOpacity: 0.9,
        weight: isSelected ? 3 : 2,
      }}
      eventHandlers={{
        click: () => {
          if (onSelect) onSelect(station.stationId);
        },
      }}
    >
      <Popup>
        <div style={{ minWidth: 220, padding: 4 }}>
          <div style={{ marginBottom: 6 }}>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-heading)', display: 'block' }}>
              {station.name}
            </strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              {placeLabel(station)}
            </span>
          </div>

          {latest ? (
            <div style={{ background: 'var(--panel-2)', padding: '8px 10px', borderRadius: 6, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Real-Time AQI:</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color }}>{latest.aqi}</span>
              </div>
              <div style={{ marginBottom: 6 }}>
                <CategoryBadge category={latest.category} level={levelOf(latest)} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: '0.72rem', color: 'var(--text-muted)', margin: '6px 0', borderTop: '1px solid var(--border)', paddingTop: 4 }}>
                <div>PM2.5: <strong>{latest.pm25 !== null ? `${latest.pm25} µg/m³` : 'N/A'}</strong></div>
                <div>PM10: <strong>{latest.pm10 !== null ? `${latest.pm10} µg/m³` : 'N/A'}</strong></div>
                <div>NO₂: <strong>{latest.no2 !== null ? `${latest.no2} µg/m³` : 'N/A'}</strong></div>
                <div>SO₂: <strong>{latest.so2 !== null ? `${latest.so2} µg/m³` : 'N/A'}</strong></div>
              </div>

              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', borderTop: '1px solid var(--border)', paddingTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                <span>Source: OpenAQ API</span>
                <span>{latest.sourceTimestamp ? new Date(latest.sourceTimestamp).toLocaleTimeString() : 'Live'}</span>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', margin: '8px 0' }}>
              Real-time AQI data unavailable
            </div>
          )}

          {onSelect && (
            <button
              type="button"
              className="btn-sm"
              style={{ width: '100%', fontSize: '0.75rem', padding: '5px 8px' }}
              onClick={() => onSelect(station.stationId)}
            >
              {isSelected ? '✓ Selected Station' : 'Select Station'}
            </button>
          )}
        </div>
      </Popup>
    </CircleMarker>
  );
}
