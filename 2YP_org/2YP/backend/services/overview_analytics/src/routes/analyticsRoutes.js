const express = require("express");
const {
  getTotalVisitors,
  getTotalCheckIns,
  getAverageDuration,
  getRepeatVisitors,
  getTop3Buildings
} = require("../controllers/analyticsController");

const router = express.Router();

router.get("/total-visitors", getTotalVisitors);
router.get("/total-checkins", getTotalCheckIns);
router.get("/avg-duration", getAverageDuration);
router.get("/repeat-visitors", getRepeatVisitors);
router.get("/top3-buildings", getTop3Buildings);

module.exports = router;

//API endpoints for testing:

//GET http://localhost:5006/analytics/total-visitors?buildingId=B3&date=2025-09-23&slot=1

//GET http://localhost:5006/analytics/total-checkins?buildingId=B3&date=2025-09-23&slot=2

//GET http://localhost:5006/analytics/avg-duration?buildingId=B3&date=2025-09-23&slot=3

//GET http://localhost:5006/analytics/repeat-visitors?buildingId=B3&date=2025-09-23&slot=1

//GET http://localhost:5006/analytics/top3-buildings?date=2025-09-23&slot=2