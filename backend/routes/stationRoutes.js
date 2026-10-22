const express = require('express');
const { listStations, getStation, getHealth } = require('../controllers/stationController');

const router = express.Router();

router.get('/stations', listStations);
router.get('/stations/:id', getStation);
router.get('/admin/health', getHealth);

module.exports = router;
