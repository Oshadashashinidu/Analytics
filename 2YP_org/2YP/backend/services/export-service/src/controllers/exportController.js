const { generateAttendanceUsagePDF } = require('../services/attendanceUsagePDF');
const { generateMovementFlowPDF } = require('../services/movementFlowPDF');
const { generateSecurityExceptionPDF } = require('../services/securityExceptionPDF');

const { generateAttendanceUsageCSV } = require('../services/attendanceUsageCSV');
const { generateMovementFlowCSV } = require('../services/movementFlowCSV'); 

const { generateEventPDF } = require("../services/eventSummaryPDF");

// ---------------- Attendance & Usage ----------------
const generateAttendancePDFReport = async (req, res) => {
  try {
    const dayParam = req.params.day ? Number(req.params.day) : undefined;
    if (dayParam !== undefined && (!Number.isFinite(dayParam) || dayParam < 1 || dayParam > 5)) {
      return res.status(400).send("Invalid day. Allowed values are 1-5.");
    }
    const file = await generateAttendanceUsagePDF({ day: dayParam });
    res.json({ message: "Attendance & Usage PDF generated", file });
  } catch (err) {
    res.status(500).json({ message: "Error generating Attendance & Usage PDF", error: err.message });
  }
};

const generateAttendanceCSVReport = async (req, res) => {
  try {
    const dayParam = req.params.day ? Number(req.params.day) : undefined;
    if (dayParam !== undefined && (!Number.isFinite(dayParam) || dayParam < 1 || dayParam > 5)) {
      return res.status(400).send("Invalid day. Allowed values are 1-5.");
    }
    const file = await generateAttendanceUsageCSV({ day: dayParam });
    res.json({ message: "Attendance & Usage CSV generated", file });
  } catch (err) {
    res.status(500).json({ message: "Error generating Attendance & Usage CSV", error: err.message });
  }
};

// ---------------- Movement & Flow ----------------
const generateMovementPDFReport = async (req, res) => {
  try {
    const dayParam = req.params.day ? Number(req.params.day) : undefined;
    if (dayParam !== undefined && (!Number.isFinite(dayParam) || dayParam < 1 || dayParam > 5)) {
      return res.status(400).send("Invalid day. Allowed values are 1-5.");
    }
    const file = await generateMovementFlowPDF({ day: dayParam });
    res.json({ message: "Movement & Flow PDF generated", file });
  } catch (err) {
    res.status(500).json({ message: "Error generating Movement & Flow PDF", error: err.message });
  }
};

const generateMovementCSVReport = async (req, res) => {
  try {
    const dayParam = req.params.day ? Number(req.params.day) : undefined;
    if (dayParam !== undefined && (!Number.isFinite(dayParam) || dayParam < 1 || dayParam > 5)) {
      return res.status(400).send("Invalid day. Allowed values are 1-5.");
    }
    const file = await generateMovementFlowCSV({ day: dayParam });
    res.json({ message: "Movement & Flow CSV generated", file });
  } catch (err) {
    res.status(500).json({ message: "Error generating Movement & Flow CSV", error: err.message });
  }
};

// ---------------- Security & Exception ----------------
const generateSecurityPDFReport = async (req, res) => {
  try {
    const dayParam = req.params.day ? Number(req.params.day) : undefined;
    if (dayParam !== undefined && (!Number.isFinite(dayParam) || dayParam < 1 || dayParam > 5)) {
      return res.status(400).send("Invalid day. Allowed values are 1-5.");
    }
    const file = await generateSecurityExceptionPDF({ day: dayParam });
    res.json({ message: "Security & Exception PDF generated", file });
  } catch (err) {
    res.status(500).json({ message: "Error generating Security & Exception PDF", error: err.message });
  }
};

// ---------------- Events ----------------
const generateEventPDFReport = async (req, res) => {
  try {
    const dayParam = req.params.day ? Number(req.params.day) : undefined;
    if (dayParam !== undefined && (!Number.isFinite(dayParam) || dayParam < 1 || dayParam > 5)) {
      return res.status(400).send("Invalid day. Allowed values are 1-5.");
    }
    const filename = await generateEventPDF({ day: dayParam });
    res.download(`exports/${filename}`);
  } catch (err) {
    console.error("Error in event PDF:", err);
    res.status(500).send("Failed to generate Event PDF");
  }
};

module.exports = {
  generateAttendancePDFReport,
  generateAttendanceCSVReport,
  generateMovementPDFReport,
  generateMovementCSVReport, 
  generateSecurityPDFReport,
  generateEventPDFReport
};
