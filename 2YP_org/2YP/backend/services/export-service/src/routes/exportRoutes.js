// routes/exportRoutes.js
const express = require('express');
const router = express.Router();
const {
  generateCSVReport,
  generateAttendancePDFReport,
  generateAnalyticsExcelReport,
  generateAnalyticsPDFReport
} = require('../controllers/exportController');

// Attendance
router.get('/attendance/csv', generateCSVReport);
router.get('/attendance/pdf', generateAttendancePDFReport);

// Analytics
router.get('/analytics/excel', generateAnalyticsExcelReport);
router.get('/analytics/pdf', generateAnalyticsPDFReport);

module.exports = router;
