const express = require('express');
const { listAlerts, getAlert, acknowledgeAlert } = require('../controllers/alertController');

const router = express.Router();

router.get('/alerts', listAlerts);
router.get('/alerts/:id', getAlert);
router.patch('/alerts/:id/ack', acknowledgeAlert);

module.exports = router;
