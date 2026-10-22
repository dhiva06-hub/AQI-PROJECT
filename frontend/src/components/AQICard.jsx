import React from 'react';
import { IconWind, IconCheckCircle, IconActivity } from './Icons';
import { colorOf, bandOf, standardOf, SCALES, levelOf, placeLabel } from '../utils/aqiScale';

export function CategoryBadge({ category, level, reading }) {
  const lvl = level || levelOf(reading) || levelOf({ category });
  if (!category && !lvl) return <span className="badge badge-outline">Data Unavailable</span>;
  const cls = lvl ? `badge-L${lvl}` : `badge-${String(category).replace(/\s+/g, '-')}`;
  return <span className={`badge ${cls}`}>{category}</span>;
}

export default function AQICard({ station, latest, connectionStatus }) {
  if (!latest) {
    return (
      <article className="card" style={{ borderTop: '4px solid var(--border)' }}>
        <div className="card-header">
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{station?.name || 'Monitoring Station'}</h3>
            <p className="card-subtitle" style={{ marginTop: 2 }}>
              {station ? placeLabel(station) : 'Station details'}
            </p>
          </div>
          <span className="badge badge-outline">Data Pending</span>
        </div>
        <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
          <p style={{ fontSize: '1rem', fontWeight: 600 }}>Real-time AQI data unavailable</p>
          <p style={{ fontSize: '0.82rem', marginTop: 4 }}>
            Waiting for live OpenAQ telemetry stream or sensor response...
          </p>
        </div>
      </article>
    );
  }

  const isLive = connectionStatus === 'live';
  const updated = latest.sourceTimestamp ? new Date(latest.sourceTimestamp) : null;
  const color = colorOf(latest);
  const band = bandOf(latest);
  const scale = SCALES[standardOf(latest)];

  // Calculate stroke dash for radial gauge (0 to 500 scale)
  const maxAQI = 500;
  const aqiVal = Math.min(Math.max(latest.aqi || 0, 0), maxAQI);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (aqiVal / maxAQI) * circumference;

  const dominant = latest.pm25 !== null && latest.pm25 > 60 ? 'PM2.5' : latest.pm10 !== null && latest.pm10 > 100 ? 'PM10' : 'PM2.5';

  return (
    <article className="card" style={{ borderTop: `4px solid ${color}` }}>
      <div className="card-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-heading)' }}>
              {station?.name || latest.stationId}
            </h3>
            <span
              className="badge badge-emerald"
              style={{
                fontSize: '0.72rem',
              }}
            >
              OpenAQ Live Feed
            </span>
          </div>
          <p className="card-subtitle" style={{ marginTop: 2 }}>
            {station ? placeLabel(station) : `Station: ${latest.stationId}`}
          </p>
        </div>

        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span className={isLive ? 'pulse-indicator-dot' : 'live-dot delayed'} />
            <strong style={{ color: isLive ? 'var(--forest-primary)' : 'var(--cpcb-satisfactory)' }}>
              {isLive ? 'SOCKET LIVE' : 'AUTO SYNC'}
            </strong>
          </div>
          {updated && <div>Last Updated: {updated.toLocaleTimeString()}</div>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', margin: '14px 0' }}>
        {/* Radial AQI Gauge */}
        <div className="aqi-radial-container">
          <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="65"
              cy="65"
              r={radius}
              stroke="var(--border)"
              strokeWidth="9"
              fill="transparent"
            />
            <circle
              cx="65"
              cy="65"
              r={radius}
              stroke={color}
              strokeWidth="9"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div className="aqi-radial-text">
            <span className="aqi-radial-val" style={{ color }}>{latest.aqi}</span>
            <span className="aqi-radial-unit">{scale.short} AQI</span>
          </div>
        </div>

        {/* Category Description & Primary Pollutant Details */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <CategoryBadge category={latest.category} level={levelOf(latest)} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Primary Pollutant: <strong style={{ color: 'var(--text-heading)' }}>{dominant}</strong>
            </span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: 12 }}>
            {band?.desc || 'Live real-time air quality index telemetry.'}
          </p>

          <div style={{ display: 'flex', gap: 14, fontSize: '0.76rem', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <IconWind size={13} color="var(--forest-primary)" />
              <span>Scale: 0 - 500</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <IconCheckCircle size={13} color="var(--emerald)" />
              <span>{scale.name}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
