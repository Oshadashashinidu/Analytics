const heatmapService = require('../services/heatmapService');

const getPeakOccupancy = async (req, res) => {
  try {
    const { hours, zone, building } = req.query;
    if (!hours || !zone || !building) {
      return res.status(400).json({ error: 'Missing required query parameters: hours, zone, building' });
    }
    const peakOccupancy = await heatmapService.getPeakOccupancy(hours, zone, building);
    res.json({ peak_occupancy: peakOccupancy });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch peak occupancy' });
  }
};

const getAvgDwellTime = async (req, res) => {
  try {
    const { hours, zone, building } = req.query;
    if (!hours || !zone || !building) {
      return res.status(400).json({ error: 'Missing required query parameters: hours, zone, building' });
    }
    const avgDwell = await heatmapService.getAvgDwellTime(hours, zone, building);
    res.json({ avg_dwell_time_minutes: avgDwell });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch average dwell time' });
  }
};

const getActivityLevel = async (req, res) => {
  try {
    const { hours } = req.query;
    if (!hours) {
      return res.status(400).json({ error: 'Missing required query parameter: hours' });
    }
    const level = await heatmapService.getActivityLevel(hours);
    res.json(level);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch activity level' });
  }
};

module.exports = {
  getPeakOccupancy,
  getAvgDwellTime,
  getActivityLevel,
};
