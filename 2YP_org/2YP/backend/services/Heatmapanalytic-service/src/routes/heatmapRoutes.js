const express = require('express');
const router = express.Router();
const heatmapController = require('../controller/heatmapController');

router.get('/peak-occupancy', heatmapController.getPeakOccupancy);
router.get('/avg-dwell-time', heatmapController.getAvgDwellTime);
router.get('/activity-level', heatmapController.getActivityLevel);
router.get('/all-analytics', heatmapController.getAllAnalytics);

module.exports = router;
