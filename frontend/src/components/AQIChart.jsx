import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart,
} from 'recharts';

export default function AQIChart({ data = [], range = '24h' }) {
  const [metricMode, setMetricMode] = useState('all'); // 'all' | 'aqi' | 'pm25' | 'pm10'

  const formatted = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];

    return data.map((m) => {
      const date = new Date(m.sourceTimestamp);
      let timeLabel = '';
      if (range === '24h') {
        timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (range === '7d') {
        timeLabel = `${date.toLocaleDateString([], { weekday: 'short' })} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        timeLabel = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }

      return {
        time: timeLabel,
        aqi: typeof m.aqi === 'number' ? m.aqi : 0,
        pm25: typeof m.pm25 === 'number' ? m.pm25 : null,
        pm10: typeof m.pm10 === 'number' ? m.pm10 : null,
        category: m.category,
        timestamp: m.sourceTimestamp,
      };
    });
  }, [data, range]);

  // Summary statistics
  const stats = useMemo(() => {
    if (!formatted.length) return { max: 0, min: 0, avg: 0 };
    const aqiVals = formatted.map((d) => d.aqi).filter((v) => v > 0);
    if (!aqiVals.length) return { max: 0, min: 0, avg: 0 };
    const max = Math.max(...aqiVals);
    const min = Math.min(...aqiVals);
    const avg = Math.round(aqiVals.reduce((acc, curr) => acc + curr, 0) / aqiVals.length);
    return { max, min, avg };
  }, [formatted]);

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
        <p style={{ fontSize: '1rem', fontWeight: 600 }}>No historical data available</p>
        <p style={{ fontSize: '0.82rem', marginTop: 4 }}>
          Measurements are saved continuously by the background ingestion pipeline as live OpenAQ readings arrive.
        </p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const current = payload[0].payload;
      return (
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            fontSize: '0.78rem',
            color: 'var(--text)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--earth-dark)' }}>{label}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {payload.map((entry) => (
              <div key={entry.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: entry.color, fontWeight: 600 }}>{entry.name}:</span>
                <span style={{ fontWeight: 700 }}>{entry.value}</span>
              </div>
            ))}
            {current.category && (
              <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid var(--border-subtle)', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                Category: <strong>{current.category}</strong>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--panel-2)', padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', borderTop: '3px solid var(--cpcb-poor)' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>PEAK AQI</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--cpcb-poor)' }}>{stats.max}</span>
          </div>
          <div style={{ background: 'var(--panel-2)', padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', borderTop: '3px solid var(--forest-primary)' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>AVERAGE AQI</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--forest-primary)' }}>{stats.avg}</span>
          </div>
          <div style={{ background: 'var(--panel-2)', padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', borderTop: '3px solid var(--cpcb-good)' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>MINIMUM AQI</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--cpcb-good)' }}>{stats.min}</span>
          </div>
        </div>

        <div className="filter-pill-group">
          {[
            { id: 'all', label: 'All Parameters' },
            { id: 'aqi', label: 'AQI' },
            { id: 'pm25', label: 'PM2.5' },
            { id: 'pm10', label: 'PM10' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              className={`filter-pill-btn ${metricMode === m.id ? 'active' : ''}`}
              onClick={() => setMetricMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <ComposedChart data={formatted} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="time" stroke="var(--text-dim)" tick={{ fontSize: 11 }} minTickGap={30} />
            <YAxis stroke="var(--text-dim)" tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '0.78rem', paddingTop: '8px' }} />

            {(metricMode === 'all' || metricMode === 'aqi') && (
              <Area
                type="monotone"
                dataKey="aqi"
                stroke="#134e2f"
                fill="rgba(19, 78, 47, 0.15)"
                strokeWidth={2.2}
                name="AQI"
                dot={false}
              />
            )}
            {(metricMode === 'all' || metricMode === 'pm25') && (
              <Line
                type="monotone"
                dataKey="pm25"
                stroke="#ea580c"
                dot={false}
                strokeWidth={1.8}
                name="PM2.5 (µg/m³)"
                connectNulls
              />
            )}
            {(metricMode === 'all' || metricMode === 'pm10') && (
              <Line
                type="monotone"
                dataKey="pm10"
                stroke="#9333ea"
                dot={false}
                strokeWidth={1.8}
                name="PM10 (µg/m³)"
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
