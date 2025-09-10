const express = require("express");
const {
  getTop3Buildings,
  getVisitorsInAllBuildings,
  getAverageDurationMostPopular,
  getRepeatVisitorsMostPopular
} = require("../controllers/analyticsController");

const router = express.Router();

router.get("/top3-buildings", getTop3Buildings);
router.get("/visitors-all", getVisitorsInAllBuildings);
router.get("/avg-duration-popular", getAverageDurationMostPopular);
router.get("/repeat-visitors-popular", getRepeatVisitorsMostPopular);

module.exports = router;

//GET http://localhost:5006/analytics/top3-buildings?date=2025-09-10

// GET http://localhost:5006/analytics/visitors-all?date=2025-09-10

// GET http://localhost:5006/analytics/avg-duration-popular?date=2025-09-10

// GET http://localhost:5006/analytics/repeat-visitors-popular?date=2025-09-10