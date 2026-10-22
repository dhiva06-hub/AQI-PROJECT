const mongoose = require('mongoose');

const MeasurementSchema = new mongoose.Schema(
  {
    stationId: { type: String, required: true, index: true },
    aqi: { type: Number, required: true, min: 0, max: 500 },
    category: {
      type: String,
      required: true,
      enum: [
        // Indian CPCB scale
        'Good', 'Satisfactory', 'Moderate', 'Poor', 'Very Poor', 'Severe',
        // US EPA scale (Good / Moderate are shared)
        'Unhealthy for Sensitive Groups', 'Unhealthy', 'Very Unhealthy', 'Hazardous',
      ],
    },
    level: { type: Number, min: 1, max: 6, default: null }, // 1 = Good ... 6 = worst, same on both scales
    standard: { type: String, enum: ['CPCB', 'US_EPA'], default: 'CPCB' },
    aqiStandard: { type: String, default: null },
    pm25: { type: Number, default: null },
    pm10: { type: Number, default: null },
    no2: { type: Number, default: null },
    so2: { type: Number, default: null },
    co: { type: Number, default: null },
    o3: { type: Number, default: null },
    dominantPollutant: { type: String, default: null }, // pollutant with the highest CPCB sub-index
    pollutantCount: { type: Number, default: null }, // pollutants used to compute the AQI
    source: { type: String, enum: ['openaq'], required: true, default: 'openaq' },
    sourceTimestamp: { type: Date, required: true },
    ingestedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Fast lookups for "latest per station" and history range queries
MeasurementSchema.index({ stationId: 1, sourceTimestamp: -1 });

module.exports = mongoose.model('Measurement', MeasurementSchema);
