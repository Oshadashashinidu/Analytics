const heatmapService = require('../services/heatmapService');

const getPeakOccupancy = async (req, res) => {
  const { hours, zone } = req.query;
  if(!hours || !zone) return res.status(400).json({ error: 'Missing query parameters: hours and zone are required.' });
  
  try {
    const data = await heatmapService.getPeakOccupancyByZone(hours, zone);
    res.json(data);
  } catch (err) {
    console.error('Error fetching peak occupancy:', err);
    res.status(500).json({ error: 'Failed to fetch peak occupancy' });
  }
};

const getAvgDwellTime = async (req, res) => {
  const { hours, zone } = req.query;
  if(!hours || !zone) return res.status(400).json({ error: 'Missing query parameters: hours and zone are required.' });

  try {
    const data = await heatmapService.getAvgDwellTimeByZone(hours, zone);
    res.json(data);
  } catch (err) {
    console.error('Error fetching avg dwell time:', err);
    res.status(500).json({ error: 'Failed to fetch average dwell time' });
  }
};

const getActivityLevel = async (req, res) => {
  const { hours, zone } = req.query;
  if(!hours || !zone) return res.status(400).json({ error: 'Missing query parameters: hours and zone are required.' });

  try {
    const data = await heatmapService.getActivityLevelByZone(hours, zone);
    res.json(data);
  } catch (err) {
    console.error('Error fetching activity level:', err);
    res.status(500).json({ error: 'Failed to fetch activity level' });
  }
};

const getAllAnalytics = async (req, res) => {
  const { hours, zone } = req.query;
  if (!hours || !zone) return res.status(400).json({ error: 'Missing query parameters: hours and zone are required.' });

  try {
    const [peakOccupancy, avgDwellTime, activityLevel] = await Promise.all([
      heatmapService.getPeakOccupancyByZone(hours, zone),
      heatmapService.getAvgDwellTimeByZone(hours, zone),
      heatmapService.getActivityLevelByZone(hours, zone)
    ]);
    res.json({
      peak_occupancy: peakOccupancy,
      avg_dwell_time: avgDwellTime,
      activity_level: activityLevel,
    });
  } catch (err) {
    console.error('Error fetching all analytics:', err);
    res.status(500).json({ error: 'Failed to fetch all analytics' });
  }
};

module.exports = {
  getPeakOccupancy,
  getAvgDwellTime,
  getActivityLevel,
  getAllAnalytics
};
