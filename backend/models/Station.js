const mongoose = require('mongoose');

const StationSchema = new mongoose.Schema(
  {
    stationId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, default: 'Unknown' },
    state: { type: String, default: '' },
    country: { type: String, required: true, default: 'Unknown' },
    countryCode: { type: String, default: null }, // ISO 3166-1 alpha-2, e.g. IN, US
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    source: { type: String, enum: ['openaq'], default: 'openaq' },
    externalUid: { type: String, default: null }, // OpenAQ location id
    sensors: [
      {
        _id: false,
        sensorId: { type: Number, required: true }, // OpenAQ sensor id
        parameter: { type: String, required: true }, // pm25 | pm10 | no2 | so2 | co | o3
        units: { type: String, default: null },
      },
    ],
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    trackHistory: { type: Boolean, default: false },
    aqiStandard: { type: String, default: null },
    discoveredAt: { type: Date, default: null },
    locality: { type: String, default: null },
    latest: {
      aqi: { type: Number, min: 0, max: 500, default: null },
      category: { type: String, default: null },
      level: { type: Number, min: 1, max: 6, default: null },
      standard: { type: String, default: null },
      aqiStandard: { type: String, default: null },
      pm25: { type: Number, default: null },
      pm10: { type: Number, default: null },
      no2: { type: Number, default: null },
      so2: { type: Number, default: null },
      co: { type: Number, default: null },
      o3: { type: Number, default: null },
      dominantPollutant: { type: String, default: null },
      pollutantCount: { type: Number, default: null },
      source: { type: String, default: 'openaq' },
      sourceTimestamp: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

StationSchema.index({ latitude: 1, longitude: 1 });

module.exports = mongoose.model('Station', StationSchema);
