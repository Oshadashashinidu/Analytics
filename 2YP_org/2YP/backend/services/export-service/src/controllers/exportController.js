// controllers/exportController.js
const { generateAttendanceCSV } = require('../services/attendanceCSV');
const { generateAttendancePDF } = require('../services/attendancePDF');
const { generateAnalyticsExcel } = require('../services/analyticsExcel');
const { generateAnalyticsPDF } = require('../services/analyticsPDF');

// Attendance CSV
const generateCSVReport = async (req, res) => {
  try {
    const file = await generateAttendanceCSV();
    res.json({ message: "Attendance CSV generated", file });
  } catch (err) {
    res.status(500).json({ message: "Error generating CSV", error: err.message });
  }
};

// Attendance PDF
const generateAttendancePDFReport = async (req, res) => {
  try {
    const file = await generateAttendancePDF();
    res.json({ message: "Attendance PDF generated", file });
  } catch (err) {
    res.status(500).json({ message: "Error generating Attendance PDF", error: err.message });
  }
};

// Analytics Excel
const generateAnalyticsExcelReport = async (req, res) => {
  try {
    const file = await generateAnalyticsExcel();
    res.json({ message: "Analytics Excel generated", file });
  } catch (err) {
    res.status(500).json({ message: "Error generating Analytics Excel", error: err.message });
  }
};

// Analytics PDF
const generateAnalyticsPDFReport = async (req, res) => {
  try {
    const file = await generateAnalyticsPDF();
    res.json({ message: "Analytics PDF generated", file });
  } catch (err) {
    res.status(500).json({ message: "Error generating Analytics PDF", error: err.message });
  }
};

module.exports = {
  generateCSVReport,
  generateAttendancePDFReport,
  generateAnalyticsExcelReport,
  generateAnalyticsPDFReport
};
