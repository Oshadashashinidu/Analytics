const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { createCanvas } = require("canvas");
const pool = require("../../../../db/db.js");

// === Bar Chart (Visitors per Building) ===
function generateBarChart(attendanceData) {
  const canvas = createCanvas(600, 400);
  const ctx = canvas.getContext("2d");

  const buildingCounts = attendanceData.reduce((acc, log) => {
    acc[log.dept_name] = (acc[log.dept_name] || 0) + 1;
    return acc;
  }, {});

  const buildings = Object.keys(buildingCounts);
  const counts = Object.values(buildingCounts);

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 600, 400);

  ctx.fillStyle = "#333";
  ctx.font = "20px Arial";
  ctx.fillText("Visitors per Building", 200, 40);

  const barWidth = 50;
  const chartHeight = 250;
  const offsetX = 80;
  const maxCount = Math.max(...counts, 1);
  const scale = chartHeight / maxCount;

  counts.forEach((count, i) => {
    const barHeight = count * scale;
    const x = offsetX + i * (barWidth + 40);
    const y = 350 - barHeight;

    ctx.fillStyle = "#1a73e8";
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "#000";
    ctx.font = "14px Arial";
    ctx.fillText(buildings[i], x - 10, 370);
    ctx.fillText(count, x + 10, y - 10);
  });

  return canvas.toBuffer();
}

// === Pie Chart (Average Stay Duration per Building) ===
function generatePieChart(avgData) {
  const canvas = createCanvas(500, 400);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 500, 400);

  const total = avgData.reduce((sum, r) => sum + parseFloat(r.avg || 0), 0);
  let start = 0;
  const colors = ["#1a73e8", "#e91e63", "#4caf50", "#ff9800", "#9c27b0", "#2196f3"];

  avgData.forEach((row, i) => {
    const avgVal = parseFloat(row.avg) || 0;
    const angle = total > 0 ? (avgVal / total) * 2 * Math.PI : 0;

    ctx.beginPath();
    ctx.moveTo(250, 200);
    ctx.arc(250, 200, 120, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();

    // Legend
    ctx.fillStyle = "#000";
    ctx.font = "14px Arial";
    ctx.fillText(
      `${row.dept_name} (${avgVal.toFixed(1)} mins)`,
      380,
      100 + i * 20
    );

    start += angle;
  });

  return canvas.toBuffer();
}

async function generateAttendancePDF() {
  try {
    const result = await pool.query(`
      SELECT 
        p.name, 
        p.contact_info, 
        b.dept_name, 
        l.entry_time, 
        l.exit_time,
        EXTRACT(EPOCH FROM (l.exit_time - l.entry_time))/60 AS duration
      FROM EntryExitLog l
      JOIN RFID_Tag t ON l.tag_id = t.tag_id
      JOIN Person p ON t.issued_to = p.person_id
      JOIN Building b ON l.building_id = b.building_id
      ORDER BY l.entry_time DESC;
    `);

    const attendanceData = result.rows;
    if (attendanceData.length === 0) {
      throw new Error("No attendance data found");
    }

    // Avg duration per building
    const avgQuery = await pool.query(`
      SELECT 
        b.dept_name, 
        AVG(EXTRACT(EPOCH FROM (l.exit_time - l.entry_time))/60) AS avg
      FROM EntryExitLog l
      JOIN Building b ON l.building_id = b.building_id
      WHERE l.exit_time IS NOT NULL
      GROUP BY b.dept_name;
    `);
    const avgData = avgQuery.rows;

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `attendance_report_${timestamp}.pdf`;
    const exportsDir = path.join(__dirname, "../../exports");
    const filepath = path.join(exportsDir, filename);

    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(filepath));

    // Header
    doc.fontSize(22).fillColor("#333").text("Attendance Report", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor("#666").text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown(2);

    // Attendance Table
    doc.fontSize(16).fillColor("#000").text("Attendance Details", { underline: true });
    doc.moveDown(1);

    attendanceData.forEach((row, i) => {
      const entry = new Date(row.entry_time).toString();
      const exit = row.exit_time ? new Date(row.exit_time).toString() : "Still inside";
      const durVal = parseFloat(row.duration);
      const duration = !isNaN(durVal) ? `${durVal.toFixed(2)} mins` : "-";

      doc.fontSize(12).fillColor("#1a73e8").text(`${i + 1}. ${row.name} (${row.contact_info})`);
      doc.fontSize(11).fillColor("#000").list([
        `Building: ${row.dept_name}`,
        `Entry: ${entry}`,
        `Exit: ${exit}`,
        `Duration: ${duration}`
      ], { bulletRadius: 2 });
      doc.moveDown(1);
    });

    // Charts
    doc.addPage();
    doc.fontSize(18).fillColor("#333").text("Visual Insights", { align: "center" });
    doc.moveDown(1);

    const barChart = generateBarChart(attendanceData);
    doc.image(barChart, { fit: [500, 300], align: "center" });
    doc.moveDown(1.5);

    const pieChart = generatePieChart(avgData);
    doc.image(pieChart, { fit: [400, 300], align: "center" });

    doc.end();
    console.log("✅ Attendance PDF Report Generated:", filepath);

    return filepath;
  } catch (error) {
    console.error("❌ Error generating Attendance PDF:", error);
    throw error;
  }
}

module.exports = { generateAttendancePDF };
