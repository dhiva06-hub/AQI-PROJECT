import React from 'react';

// Reference 24-hr safe limits (Indian NAAQS), used for the bar gauges on every station
const POLLUTANT_SPECS = {
  pm25: {
    name: 'Particulate Matter 2.5',
    unit: 'µg/m³',
    safeLimit: 60,
    maxScale: 250,
    desc: 'Fine inhalable particles ≤ 2.5µm',
  },
  pm10: {
    name: 'Particulate Matter 10',
    unit: 'µg/m³',
    safeLimit: 100,
    maxScale: 400,
    desc: 'Coarse dust and smoke particles ≤ 10µm',
  },
  no2: {
    name: 'Nitrogen Dioxide',
    unit: 'µg/m³',
    safeLimit: 80,
    maxScale: 200,
    desc: 'Emitted from vehicle exhausts and power plants',
  },
  so2: {
    name: 'Sulphur Dioxide',
    unit: 'µg/m³',
    safeLimit: 80,
    maxScale: 200,
    desc: 'Produced from burning fossil fuels & industrial processes',
  },
  co: {
    name: 'Carbon Monoxide',
    unit: 'mg/m³',
    safeLimit: 2.0,
    maxScale: 10.0,
    desc: 'Colorless toxic gas from incomplete combustion',
  },
  o3: {
    name: 'Ozone',
    unit: 'µg/m³',
    safeLimit: 100,
    maxScale: 250,
    desc: 'Ground-level photochemical oxidant',
  },
};

export default function PollutantCard({ pollutantKey, value }) {
  const spec = POLLUTANT_SPECS[pollutantKey] || {
    name: pollutantKey.toUpperCase(),
    unit: 'µg/m³',
    safeLimit: 100,
    maxScale: 300,
    desc: 'Ambient pollutant parameter',
  };

  const hasValue = value !== null && value !== undefined && typeof value === 'number';
  const numValue = hasValue ? value : 0;

  // Calculate percentage of safe limit and scale
  const ratio = spec.safeLimit && hasValue ? numValue / spec.safeLimit : 0;
  const percentOfScale = hasValue ? Math.min(100, Math.max(4, (numValue / spec.maxScale) * 100)) : 0;

  let statusColor = 'var(--cpcb-good)';
  let statusText = 'Safe';
  let badgeClass = 'badge-Good';

  if (ratio > 2.0) {
    statusColor = 'var(--cpcb-severe)';
    statusText = 'Critical';
    badgeClass = 'badge-Severe';
  } else if (ratio > 1.25) {
    statusColor = 'var(--cpcb-poor)';
    statusText = 'Unhealthy';
    badgeClass = 'badge-Poor';
  } else if (ratio > 1.0) {
    statusColor = 'var(--cpcb-moderate)';
    statusText = 'Exceeded';
    badgeClass = 'badge-Moderate';
  } else if (ratio > 0.75) {
    statusColor = 'var(--cpcb-satisfactory)';
    statusText = 'Moderate';
    badgeClass = 'badge-Satisfactory';
  }

  return (
    <article
      className="card"
      style={{
        padding: '16px 14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-heading)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            {pollutantKey.toUpperCase()}
          </span>
          {hasValue ? (
            <span className={`badge ${badgeClass}`} style={{ fontSize: '0.66rem', padding: '2px 7px' }}>
              {statusText}
            </span>
          ) : (
            <span className="badge badge-outline" style={{ fontSize: '0.66rem', padding: '2px 7px' }}>
              N/A
            </span>
          )}
        </div>

        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={spec.name}>
          {spec.name}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '4px 0 8px' }}>
          <span style={{ fontSize: '1.45rem', fontWeight: 800, color: hasValue ? 'var(--text-heading)' : 'var(--text-dim)', lineHeight: 1 }}>
            {hasValue ? numValue : '—'}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
            {spec.unit}
          </span>
        </div>
      </div>

      <div>
        {/* Progress bar */}
        <div className="meter-bar-container" title={hasValue ? `Current: ${numValue} ${spec.unit} (Safe limit: ${spec.safeLimit} ${spec.unit})` : 'Data not provided by station'}>
          <div
            className="meter-bar-fill"
            style={{
              width: `${percentOfScale}%`,
              backgroundColor: hasValue ? statusColor : 'transparent',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
          <span>Limit: &le; {spec.safeLimit}</span>
          <span>{hasValue ? `${Math.round(ratio * 100)}%` : 'N/A'}</span>
        </div>
      </div>
    </article>
  );
}
