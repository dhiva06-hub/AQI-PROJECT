import { SCALES, LEVEL_COLORS } from '../utils/aqiScale';

function ScaleRow({ scale }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-heading)', letterSpacing: '0.03em', minWidth: 150 }}>
        {scale.name.toUpperCase()} <span style={{ fontWeight: 500, color: 'var(--text-dim)' }}>({scale.where})</span>
      </div>
      {scale.bands.map((b) => (
        <div key={b.level} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: LEVEL_COLORS[b.level], display: 'inline-block' }} />
          <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{b.label}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>({b.range})</span>
        </div>
      ))}
    </div>
  );
}

export default function AQILegend() {
  return (
    <div
      className="card"
      style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 18px', background: 'var(--panel-2)' }}
    >
      <ScaleRow scale={SCALES.CPCB} />
      <ScaleRow scale={SCALES.US_EPA} />
    </div>
  );
}
