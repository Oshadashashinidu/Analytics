const express = require('express');
const router = express.Router();
const heatmapAnalytics = require('./heatmapAnalytic'); // Adjust path if necessary

function getDurationHours(req) {
  const hours = parseInt(req.query.hours);
  if (isNaN(hours) || hours <= 0 || hours > 168) {
    return 24;
  }
  return hours;
}

// GET /api/heatmap/peak-occupancy
router.get('/peak-occupancy', async (req, res) => {
  try {
    const durationHours = getDurationHours(req);
    const data = await heatmapAnalytics.getPeakOccupancy(durationHours);
    res.json(data);
  } catch (err) {
    console.error('Error fetching peak occupancy:', err);
    res.status(500).json({ message: 'Error fetching peak occupancy' });
  }
});

// GET /api/heatmap/avg-dwell-time
router.get('/avg-dwell-time', async (req, res) => {
  try {
    const durationHours = getDurationHours(req);
    const data = await heatmapAnalytics.getAvgDwellTime(durationHours);
    res.json(data);
  } catch (err) {
    console.error('Error fetching average dwell time:', err);
    res.status(500).json({ message: 'Error fetching average dwell time' });
  }
});

// GET /api/heatmap/activity-level
router.get('/activity-level', async (req, res) => {
  try {
    const durationHours = getDurationHours(req);
    const data = await heatmapAnalytics.getActivityLevel(durationHours);
    res.json({ activity_level: data.activity_level });
  } catch (err) {
    console.error('Error fetching activity level:', err);
    res.status(500).json({ message: 'Error fetching activity level' });
  }
});

module.exports = router;
