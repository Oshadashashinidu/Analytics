const { generateAttendanceUsagePDF } = require('../services/attendanceUsagePDF');
const { generateMovementFlowPDF } = require('../services/movementFlowPDF');
const { generateSecurityExceptionPDF } = require('../services/securityExceptionPDF');

// Attendance & Usage PDF
const generateAttendancePDFReport = async (req, res) => {
  try {
    const file = await generateAttendanceUsagePDF();
    res.json({ message: "Attendance & Usage PDF generated", file });
  } catch (err) {
    res.status(500).json({ message: "Error generating Attendance & Usage PDF", error: err.message });
  }
};

// Movement & Flow PDF
const generateMovementPDFReport = async (req, res) => {
  try {
    const file = await generateMovementFlowPDF();
    res.json({ message: "Movement & Flow PDF generated", file });
  } catch (err) {
    res.status(500).json({ message: "Error generating Movement & Flow PDF", error: err.message });
  }
};

// Security & Exception PDF
const generateSecurityPDFReport = async (req, res) => {
  try {
    const file = await generateSecurityExceptionPDF();
    res.json({ message: "Security & Exception PDF generated", file });
  } catch (err) {
    res.status(500).json({ message: "Error generating Security & Exception PDF", error: err.message });
  }
};

module.exports = {
  generateAttendancePDFReport,
  generateMovementPDFReport,
  generateSecurityPDFReport
};
