import { Link } from 'react-router-dom';
import { CategoryBadge } from './AQICard';
import { colorOf, levelOf } from '../utils/aqiScale';
import { IconTrendingUp } from './Icons';

export default function StationCard({ station, latest, onSelect, isSelected }) {
  const color = latest ? colorOf(latest) : 'var(--text-dim)';

  return (
    <div
      className={`station-item-card ${isSelected ? 'selected' : ''}`}
      style={{
        borderLeft: isSelected ? '4px solid var(--forest-primary)' : '4px solid transparent',
      }}
      onClick={() => onSelect && onSelect(station.stationId)}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <strong style={{ fontSize: '0.94rem', color: 'var(--text-heading)', fontWeight: 700 }}>
            {station.name}
          </strong>
          {isSelected && (
            <span className="badge badge-emerald" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
              Focused
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
          {station.city}{station.state ? `, ${station.state}` : ''} {station.country ? `· ${station.country}` : ''} · {station.latitude?.toFixed(2)}°N, {station.longitude?.toFixed(2)}°E
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {latest ? (
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color }}>{latest.aqi}</span>
              <CategoryBadge category={latest.category} level={levelOf(latest)} />
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 2 }}>
              PM2.5: {latest.pm25 !== null ? latest.pm25 : 'N/A'} · PM10: {latest.pm10 !== null ? latest.pm10 : 'N/A'}
            </div>
          </div>
        ) : (
          <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Data Pending</span>
        )}

        <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
          <Link
            to={`/history?stationId=${encodeURIComponent(station.stationId)}`}
            className="btn-secondary btn-icon"
            style={{ width: 32, height: 32 }}
            title="View Historical Trends"
          >
            <IconTrendingUp size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
