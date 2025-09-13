const analyticsService = require("../services/analyticsService");

// 1. Total visitors in a building
async function getTotalVisitors(req, res) {
  try {
    const { buildingId, date, slot } = req.query;
    const data = await analyticsService.getTotalVisitors(buildingId, date, slot);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch total visitors" });
  }
}

// 2. Total check-ins
async function getTotalCheckIns(req, res) {
  try {
    const { buildingId, date, slot } = req.query;
    const data = await analyticsService.getTotalCheckIns(buildingId, date, slot);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch total check-ins" });
  }
}

// 3. Average duration
async function getAverageDuration(req, res) {
  try {
    const { buildingId, date, slot } = req.query;
    const data = await analyticsService.getAverageDuration(buildingId, date, slot);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch average duration" });
  }
}

// 4. Repeat visitors
async function getRepeatVisitors(req, res) {
  try {
    const { buildingId, date, slot } = req.query;
    const data = await analyticsService.getRepeatVisitors(buildingId, date, slot);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch repeat visitors" });
  }
}

// 5. Top 3 buildings
async function getTop3Buildings(req, res) {
  try {
    const { date, slot } = req.query;
    const data = await analyticsService.getTop3Buildings(date, slot);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch top 3 buildings" });
  }
}

module.exports = {
  getTotalVisitors,
  getTotalCheckIns,
  getAverageDuration,
  getRepeatVisitors,
  getTop3Buildings
};
