const analyticsService = require("../services/analyticsService");

// 1. Top 3 buildings
async function getTop3Buildings(req, res) {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const data = await analyticsService.getTop3Buildings(date);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch top 3 buildings" });
  }
}

// 2. Visitors in all buildings
async function getVisitorsInAllBuildings(req, res) {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const data = await analyticsService.getVisitorsInAllBuildings(date);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch visitors in all buildings" });
  }
}

// 3. Average duration in most popular building
async function getAverageDurationMostPopular(req, res) {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const data = await analyticsService.getAverageDurationMostPopular(date);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch average duration" });
  }
}

// 4. Repeat visitors in most popular building
async function getRepeatVisitorsMostPopular(req, res) {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const data = await analyticsService.getRepeatVisitorsMostPopular(date);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch repeat visitors" });
  }
}

module.exports = {
  getTop3Buildings,
  getVisitorsInAllBuildings,
  getAverageDurationMostPopular,
  getRepeatVisitorsMostPopular
};
