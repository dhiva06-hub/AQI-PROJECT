import React from 'react';
import { IconCpu, IconDatabase, IconActivity, IconFileText } from './Icons';

export default function TechStackDrawer({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tech-specs-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(8, 20, 15, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: 720,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 18,
          padding: 28,
          boxShadow: '0 24px 64px -12px rgba(8, 20, 15, 0.45), 0 8px 24px -4px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h2 id="tech-specs-title" style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="card-icon-badge">
                <IconCpu size={18} />
              </span>
              <span>System Architecture & Telemetry Pipeline</span>
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Production MERN full-stack architecture, OpenAQ ingestion pipeline, and Leaflet OpenStreetMap mapping
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary btn-sm" aria-label="Close dialog">
            ✕ Close
          </button>
        </div>

        {/* Tech Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {[
            'React 18 + Vite',
            'Node.js + Express',
            'OpenAQ v3 API',
            'MongoDB Atlas / Mongoose',
            'Socket.IO Live Streaming',
            'Leaflet + OpenStreetMap',
            'Recharts Timeseries',
            'Indian CPCB AQI + US EPA AQI',
            'node-cron Ingestion Pipeline',
            'JWT Authentication',
          ].map((tech) => (
            <span
              key={tech}
              className="badge badge-emerald"
              style={{ fontSize: '0.72rem' }}
            >
              {tech}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {/* Ingestion pipeline */}
          <div style={{ background: 'var(--panel-2)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <h4 style={{ color: 'var(--text-heading)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconActivity size={16} color="var(--forest-primary)" />
              <span>Real-Time Ingestion & Streaming Flow</span>
            </h4>
            <p style={{ lineHeight: 1.5, fontSize: '0.82rem' }}>
              The backend cron scheduler polls the OpenAQ v3 API for monitoring stations in every country (paced to OpenAQ's rate limit). Raw pollutant concentrations (PM2.5, PM10, NO₂, SO₂, CO, O₃) are converted to CPCB units, calculated into standard AQI (highest sub-index wins), validated, persisted to MongoDB Atlas, and pushed to active React clients over Socket.IO (event: <code>aqiUpdated</code>).
            </p>
          </div>

          {/* Mapping system */}
          <div style={{ background: 'var(--panel-2)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <h4 style={{ color: 'var(--text-heading)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconDatabase size={16} color="var(--forest-primary)" />
              <span>Geospatial Station Mapping</span>
            </h4>
            <p style={{ lineHeight: 1.5, fontSize: '0.82rem' }}>
              Built with Leaflet and standard OpenStreetMap tiles. Station markers reflect verified geographic coordinates, with color markers derived from the current AQI level and detailed real-time pollutant measurements.
            </p>
          </div>

          {/* AQI scales */}
          <div style={{ background: 'var(--panel-2)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <h4 style={{ color: 'var(--text-heading)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconFileText size={16} color="var(--forest-primary)" />
              <span>AQI Scales Implemented</span>
            </h4>
            <p style={{ lineHeight: 1.5, fontSize: '0.82rem' }}>
              India uses the <strong>Indian CPCB AQI</strong> (Good, Satisfactory, Moderate, Poor, Very Poor, Severe). Every other country uses the <strong>US EPA AQI</strong> (Good, Moderate, Unhealthy for Sensitive Groups, Unhealthy, Very Unhealthy, Hazardous). Both run 0–500 and are calculated from raw PM2.5, PM10, NO₂, SO₂, CO and O₃ readings; the highest pollutant sub-index sets the AQI.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 22, textAlign: 'right' }}>
          <button type="button" onClick={onClose} style={{ padding: '9px 20px', borderRadius: 9, fontSize: '0.85rem' }}>
            Close Specifications
          </button>
        </div>
      </div>
    </div>
  );
}
