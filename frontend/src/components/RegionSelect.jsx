/**
 * Country filter used on the Dashboard, Map and Stations pages.
 * value === 'ALL' means the whole world.
 */
export default function RegionSelect({ value, onChange, countries, stationCount, label = 'Region Filter' }) {
  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        padding: '12px 18px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <label
          htmlFor="region-select"
          style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'var(--text-heading)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {label}:
        </label>
        <select
          id="region-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            minWidth: 230,
            height: 38,
            padding: '0 12px',
            fontSize: '0.85rem',
            fontWeight: 600,
            borderRadius: 8,
          }}
        >
          <option value="ALL">🌍 Global Network ({stationCount} stations)</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="pulse-indicator-dot" />
        <span>{countries.length} active {countries.length === 1 ? 'country' : 'countries'} · OpenAQ Verified Sensors</span>
      </div>
    </div>
  );
}
