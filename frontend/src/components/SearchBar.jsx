import { IconSearch } from './Icons';

export default function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = 'Search by country, city, station, or any place (e.g. London, Delhi, Tokyo)...',
  isLoading = false,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(value);
  };

  return (
    <form onSubmit={handleSubmit} style={{ position: 'relative', width: '100%', display: 'flex', gap: 10 }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <span
          style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-dim)',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <IconSearch size={18} />
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            paddingLeft: 42,
            paddingRight: 14,
            height: 44,
            borderRadius: 9,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            boxShadow: '0 1px 4px rgba(20, 32, 28, 0.04)',
            fontSize: '0.88rem',
            color: 'var(--text)',
          }}
        />
      </div>
      {onSearch && (
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          style={{
            padding: '0 20px',
            height: 44,
            borderRadius: 9,
            whiteSpace: 'nowrap',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          {isLoading ? 'Checking...' : 'Check AQI'}
        </button>
      )}
    </form>
  );
}
