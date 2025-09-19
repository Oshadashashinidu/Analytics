const express = require("express");
const {
  getTotalVisitors,
  getTotalCheckIns,
  getAverageDuration,
  getRepeatVisitors,
  getTop3Buildings,
  getVisitorsPerBuilding
} = require("../controllers/analyticsController");

const router = express.Router();

// API endpoints

// GET total visitors (count_per_day)
//  http://localhost:5006/analytics/total-visitors?buildingId=B1&date=2025-09-19
router.get("/total-visitors", getTotalVisitors);

// GET total check-ins (real-time, total_count)
//  http://localhost:5006/analytics/total-checkins?buildingId=B1&date=2025-09-19
router.get("/total-checkins", getTotalCheckIns);

// GET average duration (still uses logs)
//  http://localhost:5006/analytics/avg-duration?buildingId=B1&date=2025-09-19
router.get("/avg-duration", getAverageDuration);

// GET repeat visitors (still uses logs)
//  http://localhost:5006/analytics/repeat-visitors?buildingId=B1&date=2025-09-19
router.get("/repeat-visitors", getRepeatVisitors);

// GET top 3 buildings ranked by visitors
//  http://localhost:5006/analytics/top3-buildings?date=2025-09-19
router.get("/top3-buildings", getTop3Buildings);

// GET top 10 buildings ranked by visitors
//  http://localhost:5006/analytics/visitors-per-building?date=2025-09-19
router.get("/visitors-per-building", getVisitorsPerBuilding);

module.exports = router;


//api key
//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsY2t6eGJzdWZ3amxzeXh4em96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMTAwODcsImV4cCI6MjA3MzU4NjA4N30.J8MMNsdLQh6dw7QC1pFtWIZsYV5e2S2iRfWD_vWMsPM

//supabase link
// https://ulckzxbsufwjlsyxxzoz.supabase.co/rest/v1/BUILDING?select=total_count&building_id=eq
