import React, { useState } from 'react';
import { CategoryBadge } from './AQICard';
import { IconSliders } from './Icons';

export default function StationComparator({ stations = [], readings = {} }) {
  const [stationAId, setStationAId] = useState(stations[0]?.stationId || '');
  const [stationBId, setStationBId] = useState(stations[1]?.stationId || stations[0]?.stationId || '');

  const stationA = stations.find((s) => s.stationId === stationAId) || stations[0];
  const stationB = stations.find((s) => s.stationId === stationBId) || stations[1];

  const readingA = stationA ? readings[stationA.stationId] : null;
  const readingB = stationB ? readings[stationB.stationId] : null;

  const pollutants = [
    { key: 'aqi', label: 'AQI', unit: '' },
    { key: 'pm25', label: 'PM2.5', unit: 'µg/m³' },
    { key: 'pm10', label: 'PM10', unit: 'µg/m³' },
    { key: 'no2', label: 'NO₂', unit: 'µg/m³' },
    { key: 'so2', label: 'SO₂', unit: 'µg/m³' },
    { key: 'co', label: 'CO', unit: 'mg/m³' },
    { key: 'o3', label: 'O₃', unit: 'µg/m³' },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <span className="card-icon-badge">
              <IconSliders size={16} />
            </span>
            <span>Station Side-by-Side Comparator</span>
          </h3>
          <p className="card-subtitle">
            Compare real-time air quality metrics and telemetry variance between two monitoring stations
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-heading)', display: 'block', marginBottom: 5 }}>
            Station Alpha
          </label>
          <select
            value={stationAId}
            onChange={(e) => setStationAId(e.target.value)}
            style={{ width: '100%', fontWeight: 600, height: 40, borderRadius: 8 }}
          >
            {stations.map((s) => (
              <option key={`a-${s.stationId}`} value={s.stationId}>
                {s.name} ({s.city})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-heading)', display: 'block', marginBottom: 5 }}>
            Station Beta
          </label>
          <select
            value={stationBId}
            onChange={(e) => setStationBId(e.target.value)}
            style={{ width: '100%', fontWeight: 600, height: 40, borderRadius: 8 }}
          >
            {stations.map((s) => (
              <option key={`b-${s.stationId}`} value={s.stationId}>
                {s.name} ({s.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', background: 'var(--panel-2)' }}>
              <th style={{ padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Parameter</th>
              <th style={{ padding: '10px 14px', color: 'var(--text-heading)', fontWeight: 700 }}>
                {stationA?.name || 'Station A'}
              </th>
              <th style={{ padding: '10px 14px', color: 'var(--text-heading)', fontWeight: 700 }}>
                {stationB?.name || 'Station B'}
              </th>
              <th style={{ padding: '10px 14px', color: 'var(--text-dim)', fontWeight: 700 }}>Variance / Delta</th>
            </tr>
          </thead>
          <tbody>
            {pollutants.map((p) => {
              const valA = readingA ? readingA[p.key] : null;
              const valB = readingB ? readingB[p.key] : null;
              const hasBoth = valA !== null && valA !== undefined && valB !== null && valB !== undefined;
              const delta = hasBoth ? (valA - valB).toFixed(1) : '—';
              const isDiff = hasBoth && valA !== valB;
              const betterStation = hasBoth ? (valA < valB ? 'Station A' : 'Station B') : null;

              return (
                <tr key={p.key} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>{p.label}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {valA !== null && valA !== undefined ? (
                      <span style={{ fontWeight: 800, color: 'var(--text-heading)' }}>
                        {valA} {p.unit}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>N/A</span>
                    )}
                    {p.key === 'aqi' && readingA?.category && (
                      <span style={{ marginLeft: 6 }}>
                        <CategoryBadge category={readingA.category} level={readingA.level} />
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {valB !== null && valB !== undefined ? (
                      <span style={{ fontWeight: 800, color: 'var(--text-heading)' }}>
                        {valB} {p.unit}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>N/A</span>
                    )}
                    {p.key === 'aqi' && readingB?.category && (
                      <span style={{ marginLeft: 6 }}>
                        <CategoryBadge category={readingB.category} level={readingB.level} />
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', color: isDiff ? (Number(delta) < 0 ? 'var(--forest-primary)' : 'var(--cpcb-poor)') : 'var(--text-dim)' }}>
                    {hasBoth ? (
                      <span>
                        <strong style={{ fontWeight: 700 }}>{Number(delta) > 0 ? `+${delta}` : delta} {p.unit}</strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginLeft: 6 }}>
                          ({betterStation} is cleaner)
                        </span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
