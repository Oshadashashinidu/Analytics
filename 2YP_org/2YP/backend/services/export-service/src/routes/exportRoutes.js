const express = require('express');
const router = express.Router();
const {
  generateAttendancePDFReport,
  generateMovementPDFReport,
  generateSecurityPDFReport
} = require('../controllers/exportController');

// Reports
router.get('/attendance/pdf', generateAttendancePDFReport);
router.get('/movement/pdf', generateMovementPDFReport);
router.get('/security/pdf', generateSecurityPDFReport);

module.exports = router;
