import React from 'react';
import { IconShieldCheck } from './Icons';
import { levelOf, SCALES } from '../utils/aqiScale';

export default function HealthAdvisory({ category, aqi, level, standard = 'CPCB' }) {
  const hasData = aqi !== null && aqi !== undefined && category;

  if (!hasData) {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <span className="card-icon-badge">
                <IconShieldCheck size={16} />
              </span>
              <span>Health & Activity Guidance</span>
            </h3>
            <p className="card-subtitle">
              Real-time environmental health precautions
            </p>
          </div>
          <div className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
            {(SCALES[standard] || SCALES.CPCB).name}
          </div>
        </div>
        <div
          style={{
            background: 'var(--panel-2)',
            padding: '24px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.88rem',
          }}
        >
          <p style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: 4 }}>
            Health recommendations pending
          </p>
          <p style={{ fontSize: '0.8rem' }}>
            Select an active station with live pollutant measurements to display tailored medical and outdoor activity precautions.
          </p>
        </div>
      </div>
    );
  }

  const lvl = level || levelOf({ category }) || 1;
  const getAdvisories = () => {
    switch (lvl) {
      case 1:
        return {
          overall: 'Air quality is considered satisfactory, and air pollution poses little or no risk.',
          outdoor: { status: 'Optimal', text: 'Safe for all outdoor recreation, running, and workouts.', color: 'var(--cpcb-good)' },
          sensitive: { status: 'Safe', text: 'No precautions needed for children, elderly, or asthmatics.', color: 'var(--cpcb-good)' },
          mask: { status: 'Not Needed', text: 'Ambient air is clean and safe to breathe.', color: 'var(--cpcb-good)' },
          ventilation: { status: 'Recommended', text: 'Open windows to bring in fresh outdoor air.', color: 'var(--cpcb-good)' },
        };
      case 2:
        return {
          overall: 'Air quality is acceptable; very minor discomfort may occur for highly sensitive individuals.',
          outdoor: { status: 'Normal', text: 'Outdoor recreation and exercises are suitable.', color: 'var(--cpcb-satisfactory)' },
          sensitive: { status: 'Minor Caution', text: 'Sensitive individuals with respiratory conditions should monitor symptoms.', color: 'var(--cpcb-satisfactory)' },
          mask: { status: 'Optional', text: 'Generally not required unless specifically sensitive.', color: 'var(--cpcb-satisfactory)' },
          ventilation: { status: 'Allowed', text: 'Ventilation is safe during daytime hours.', color: 'var(--cpcb-satisfactory)' },
        };
      case 3:
        return {
          overall: 'Sensitive groups may experience respiratory discomfort on prolonged outdoor exposure.',
          outdoor: { status: 'Moderate', text: 'Reduce intense strenuous outdoor exercises if feeling fatigue.', color: 'var(--cpcb-moderate)' },
          sensitive: { status: 'Take Care', text: 'People with asthma or heart conditions should carry emergency inhalers.', color: 'var(--cpcb-moderate)' },
          mask: { status: 'Advisory', text: 'Consider wearing an anti-pollution mask in high-traffic zones.', color: 'var(--cpcb-moderate)' },
          ventilation: { status: 'Limited', text: 'Avoid keeping windows open during peak rush-hour traffic.', color: 'var(--cpcb-moderate)' },
        };
      case 4:
        return {
          overall: 'Breathing discomfort likely for most people on prolonged exposure. High pollution advisory.',
          outdoor: { status: 'Limit', text: 'Avoid prolonged heavy workouts outdoors. Prefer indoor exercises.', color: 'var(--cpcb-poor)' },
          sensitive: { status: 'High Risk', text: 'Children, elderly, and those with lung disorders should remain indoors.', color: 'var(--cpcb-poor)' },
          mask: { status: 'Recommended', text: 'Wear an N95 or equivalent filtration mask outside.', color: 'var(--cpcb-poor)' },
          ventilation: { status: 'Close Windows', text: 'Keep windows shut and run indoor air purifiers if available.', color: 'var(--cpcb-poor)' },
        };
      case 5:
      case 6:
        return {
          overall: 'Severe level air pollution. High risk of respiratory illness for everyone.',
          outdoor: { status: 'Avoid', text: 'Strictly avoid outdoor jogging, sports, and unnecessary travel.', color: 'var(--cpcb-severe)' },
          sensitive: { status: 'Critical', text: 'Sensitive groups must stay indoors with air purification active.', color: 'var(--cpcb-severe)' },
          mask: { status: 'Mandatory N95', text: 'N95/N99 respirator mask is essential if going outside.', color: 'var(--cpcb-severe)' },
          ventilation: { status: 'Closed', text: 'Seal doors/windows. Operate HEPA air purifiers continuously.', color: 'var(--cpcb-severe)' },
        };
      default:
        return {
          overall: 'Standard ambient air precautions apply.',
          outdoor: { status: 'Normal', text: 'Outdoor activities are acceptable.', color: 'var(--earth-dim)' },
          sensitive: { status: 'Standard', text: 'Follow standard personal health practices.', color: 'var(--earth-dim)' },
          mask: { status: 'Optional', text: 'Wear mask if required.', color: 'var(--earth-dim)' },
          ventilation: { status: 'Normal', text: 'Standard ventilation.', color: 'var(--earth-dim)' },
        };
    }
  };

  const advisory = getAdvisories();

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <span className="card-icon-badge">
              <IconShieldCheck size={16} />
            </span>
            <span>Health & Activity Guidance</span>
          </h3>
          <p className="card-subtitle">
            Environmental health recommendations for current AQI: <strong>{aqi} ({category})</strong>
          </p>
        </div>
        <div className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
          {(SCALES[standard] || SCALES.CPCB).name}
        </div>
      </div>

      <div
        style={{
          background: 'var(--panel-2)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          borderLeft: '4px solid var(--forest-primary)',
          border: '1px solid var(--border)',
          borderLeftWidth: '4px',
          marginBottom: 14,
          fontSize: '0.85rem',
          color: 'var(--text-heading)',
          lineHeight: 1.45,
        }}
      >
        <strong>Guidance: </strong> {advisory.overall}
      </div>

      <div className="grid grid-cols-4">
        {/* Outdoor Activity */}
        <div style={{ background: 'var(--panel-2)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.04em' }}>OUTDOOR</span>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: advisory.outdoor.color }}>
              {advisory.outdoor.status}
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {advisory.outdoor.text}
          </p>
        </div>

        {/* Sensitive Groups */}
        <div style={{ background: 'var(--panel-2)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.04em' }}>SENSITIVE</span>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: advisory.sensitive.color }}>
              {advisory.sensitive.status}
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {advisory.sensitive.text}
          </p>
        </div>

        {/* Mask Advisory */}
        <div style={{ background: 'var(--panel-2)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.04em' }}>RESPIRATOR</span>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: advisory.mask.color }}>
              {advisory.mask.status}
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {advisory.mask.text}
          </p>
        </div>

        {/* Ventilation */}
        <div style={{ background: 'var(--panel-2)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.04em' }}>VENTILATION</span>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: advisory.ventilation.color }}>
              {advisory.ventilation.status}
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {advisory.ventilation.text}
          </p>
        </div>
      </div>
    </div>
  );
}
