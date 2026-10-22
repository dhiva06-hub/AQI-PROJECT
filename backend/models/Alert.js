const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema(
  {
    stationId: { type: String, required: true, index: true },
    aqi: { type: Number, required: true },
    category: { type: String, required: true },
    message: { type: String, required: true },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
    triggeredAt: { type: Date, default: Date.now },
    acknowledged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alert', AlertSchema);
