const express = require('express');
const {
  getCurrentAll,
  getAvailableCities,
  lookupLocationAQI,
  getCurrentByCity,
  getHistory,
} = require('../controllers/airQualityController');

const router = express.Router();

router.get('/air-quality/current', getCurrentAll);
router.get('/air-quality/available-cities', getAvailableCities);
router.get('/air-quality/lookup', lookupLocationAQI);
router.get('/air-quality/:city', getCurrentByCity);
router.get('/history/:stationId', getHistory);

module.exports = router;
