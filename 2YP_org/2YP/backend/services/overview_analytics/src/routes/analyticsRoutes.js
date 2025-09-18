const express = require("express");
const {
  getTotalVisitors,
  getTotalCheckIns,
  getAverageDuration,
  getRepeatVisitors,
  getTop3Buildings,
  getVisitorsPerBuilding,
  getVisitorsGrowth,
  getCheckInsGrowth,
  getAvgDurationGrowth
} = require("../controllers/analyticsController");

const router = express.Router();

router.get("/total-visitors", getTotalVisitors);
router.get("/total-checkins", getTotalCheckIns);
router.get("/avg-duration", getAverageDuration);
router.get("/repeat-visitors", getRepeatVisitors);
router.get("/top3-buildings", getTop3Buildings);
router.get("/visitors-per-building", getVisitorsPerBuilding);

// 3 separate routes
router.get("/visitors-growth", getVisitorsGrowth);
router.get("/checkins-growth", getCheckInsGrowth);
router.get("/avg-duration-growth", getAvgDurationGrowth);

module.exports = router;

//API endpoints for testing:

//GET http://localhost:5006/analytics/total-visitors?buildingId=B4&date=2025-09-17&slot=2

//GET http://localhost:5006/analytics/total-checkins?buildingId=B4&date=2025-09-17&slot=2

//GET http://localhost:5006/analytics/avg-duration?buildingId=B4&date=2025-09-17&slot=2

//GET http://localhost:5006/analytics/repeat-visitors?buildingId=B4&date=2025-09-17&slot=2

//GET http://localhost:5006/analytics/top3-buildings?date=2025-09-17&slot=2

//GET http://localhost:5006/analytics/visitors-per-building?date=2025-09-17&slot=2

// visitors Growth:
// GET http://localhost:5006/analytics/visitors-growth?buildingId=B4&date=2025-09-17&slot=2
// GET http://localhost:5006/analytics/checkins-growth?buildingId=B4&date=2025-09-17&slot=2
// GET http://localhost:5006/analytics/avg-duration-growth?buildingId=B4&date=2025-09-17&slot=2

