import React, { useState, useMemo } from 'react';
import { useAQI } from '../hooks/useAQI';
import { CategoryBadge } from '../components/AQICard';
import { levelOf, placeLabel } from '../utils/aqiScale';
import HealthAdvisory from '../components/HealthAdvisory';
import {
  IconAlertTriangle,
  IconShieldCheck,
  IconRefreshCw,
} from '../components/Icons';

export default function AlertsPage() {
  const { readings, stationsMeta, loading, error, refetch } = useAQI();
  const [severityFilter, setSeverityFilter] = useState('ALL');

  const stationsList = Object.values(stationsMeta);

  // Group stations by alert status based on real data
  const stationAlerts = useMemo(() => {
    return stationsList.map((station) => {
      const reading = readings[station.stationId] || {};
      const aqi = reading.aqi ?? null;
      const category = reading.category || null;

      let alertLevel = 'normal';
      const lvl = levelOf(reading);
      if (lvl >= 4) {
        alertLevel = 'critical';
      } else if (lvl === 3) {
        alertLevel = 'elevated';
      }

      return {
        station,
        reading,
        aqi,
        category,
        alertLevel,
      };
    });
  }, [stationsList, readings]);

  // Statistics
  const stats = useMemo(() => {
    let critical = 0;
    let elevated = 0;
    let normal = 0;
    let maxAqi = 0;
    let worstStation = null;

    stationAlerts.forEach((item) => {
      if (item.alertLevel === 'critical') critical++;
      else if (item.alertLevel === 'elevated') elevated++;
      else if (item.aqi !== null) normal++;

      if (item.aqi && item.aqi > maxAqi) {
        maxAqi = item.aqi;
        worstStation = item;
      }
    });

    return { critical, elevated, normal, worstStation, maxAqi };
  }, [stationAlerts]);

  // Filtered station alert list
  const filteredAlerts = useMemo(() => {
    if (severityFilter === 'CRITICAL') {
      return stationAlerts.filter((item) => item.alertLevel === 'critical');
    }
    if (severityFilter === 'ELEVATED') {
      return stationAlerts.filter((item) => item.alertLevel === 'elevated');
    }
    if (severityFilter === 'NORMAL') {
      return stationAlerts.filter((item) => item.alertLevel === 'normal' && item.aqi !== null);
    }
    return stationAlerts;
  }, [stationAlerts, severityFilter]);

  if (error) {
    return (
      <div className="error-box" role="alert">
        <strong>Error loading alerts:</strong> {error}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <section className="page-header-wrap">
        <div>
          <div className="page-badge-pill">
            <span className="pulse-indicator-dot" />
            <span>Environmental Advisories · Health Risk Telemetry</span>
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="card-icon-badge">
              <IconAlertTriangle size={18} />
            </span>
            <span>Air Quality Advisories & Station Alerts</span>
          </h1>
          <p className="page-subtitle">
            Real-time advisory levels calculated from active OpenAQ station feeds on the Indian CPCB scale (India) or the US EPA scale (everywhere else). Immediate health protection guidance for sensitive groups.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="btn-secondary btn-sm"
          title="Refresh live alert telemetry"
        >
          <IconRefreshCw size={14} />
          <span>Refresh Alerts</span>
        </button>
      </section>

      {/* Summary KPI Cards */}
      <section className="grid grid-cols-4" aria-label="Alert Overview KPI Cards">
        <div className="kpi-card" style={{ borderTop: '3px solid var(--forest-primary)' }}>
          <div className="kpi-label">Active Monitored Stations</div>
          <div className="kpi-value" style={{ color: 'var(--text-heading)' }}>
            {stationsList.length}
          </div>
          <div className="kpi-subtext">
            <span>Verified OpenAQ sensor fleet</span>
          </div>
        </div>

        <div className="kpi-card" style={{ borderTop: '3px solid var(--cpcb-poor)' }}>
          <div className="kpi-label">Critical Stations</div>
          <div className="kpi-value" style={{ color: stats.critical > 0 ? 'var(--cpcb-poor)' : 'var(--cpcb-good)' }}>
            {stats.critical}
          </div>
          <div className="kpi-subtext">
            <span>Poor / Unhealthy and above</span>
          </div>
        </div>

        <div className="kpi-card" style={{ borderTop: '3px solid var(--cpcb-moderate)' }}>
          <div className="kpi-label">Elevated Stations</div>
          <div className="kpi-value" style={{ color: 'var(--cpcb-moderate)' }}>
            {stats.elevated}
          </div>
          <div className="kpi-subtext">
            <span>Moderate / Sensitive groups advisory</span>
          </div>
        </div>

        <div className="kpi-card" style={{ borderTop: '3px solid var(--cpcb-good)' }}>
          <div className="kpi-label">Clean Air Stations</div>
          <div className="kpi-value" style={{ color: 'var(--cpcb-good)' }}>
            {stats.normal}
          </div>
          <div className="kpi-subtext">
            <span>Optimal / Satisfactory air quality</span>
          </div>
        </div>
      </section>

      {/* Health Guidance for Highest AQI Station */}
      {stats.worstStation && stats.worstStation.aqi && (
        <HealthAdvisory
          aqi={stats.worstStation.aqi}
          category={stats.worstStation.category || 'Good'}
          level={stats.worstStation.reading?.level}
          standard={stats.worstStation.reading?.standard}
        />
      )}

      {/* Station Alert Status Directory */}
      <section aria-label="Station Alert Status Table">
        <div className="section-header">
          <div className="section-title-wrap">
            <h2>
              <span className="card-icon-badge">
                <IconShieldCheck size={16} />
              </span>
              <span>Station Advisory Directory</span>
            </h2>
            <p>Real-time status, pollutant breakdown, and health category per station</p>
          </div>

          <div className="filter-pill-group">
            {[
              { id: 'ALL', label: `All Stations (${stationsList.length})` },
              { id: 'CRITICAL', label: `Critical (${stats.critical})` },
              { id: 'ELEVATED', label: `Elevated (${stats.elevated})` },
              { id: 'NORMAL', label: `Clean (${stats.normal})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`filter-pill-btn ${severityFilter === tab.id ? 'active' : ''}`}
                onClick={() => setSeverityFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="card" style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
            <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>No active stations in this advisory category.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {filteredAlerts.map(({ station, reading, aqi, category, alertLevel }) => (
              <div
                key={station.stationId}
                className="card"
                style={{
                  borderLeft: `4px solid ${
                    alertLevel === 'critical'
                      ? 'var(--cpcb-poor)'
                      : alertLevel === 'elevated'
                      ? 'var(--cpcb-moderate)'
                      : 'var(--green-primary)'
                  }`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                      {station.name}
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
                      {placeLabel(station)}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                      {aqi !== null ? aqi : '—'}
                    </div>
                    <CategoryBadge category={category} level={levelOf(reading)} />
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 6,
                    background: 'var(--panel-2)',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.74rem',
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>PM2.5</div>
                    <div style={{ fontWeight: 700 }}>{reading.pm25 !== null && reading.pm25 !== undefined ? `${reading.pm25}` : 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>PM10</div>
                    <div style={{ fontWeight: 700 }}>{reading.pm10 !== null && reading.pm10 !== undefined ? `${reading.pm10}` : 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>NO2</div>
                    <div style={{ fontWeight: 700 }}>{reading.no2 !== null && reading.no2 !== undefined ? `${reading.no2}` : 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>SO2</div>
                    <div style={{ fontWeight: 700 }}>{reading.so2 !== null && reading.so2 !== undefined ? `${reading.so2}` : 'N/A'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 'auto' }}>
                  <span>Source: OpenAQ Feed</span>
                  <span>
                    {reading.sourceTimestamp
                      ? new Date(reading.sourceTimestamp).toLocaleTimeString()
                      : 'Live'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
