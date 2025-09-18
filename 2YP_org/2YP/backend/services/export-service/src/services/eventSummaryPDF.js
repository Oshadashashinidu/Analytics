// src/services/eventSummaryPDF.js
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const pool = require("../utils/db1.js"); // adjust as needed
const { getDateForDay } = require("../utils/dates");

const CHART_WIDTH = 350;
const CHART_HEIGHT = 200;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: CHART_WIDTH, height: CHART_HEIGHT });

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fmtHours(mins) {
  const n = safeNum(mins);
  if (n === 0) return "0h";
  const h = (n / 60).toFixed(1);
  return `${h}h`;
}

// KPI block renderer
function drawKPIBlock(doc, title, value, x, y, width, height, color) {
  doc.roundedRect(x, y, width, height, 8)
    .fillOpacity(0.1)
    .fill(color)
    .fillOpacity(1)
    .strokeColor(color)
    .stroke();

  doc.fontSize(12).fillColor(color).text(title, x + 10, y + 8);
  doc.fontSize(18).fillColor("#000").text(value, x + 10, y + 30);
}

// Simple table renderer
function drawTable(doc, headers, rows, x, y, colWidths) {
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#0b4b8a");
  let cursorX = x;
  headers.forEach((h, i) => {
    doc.text(h, cursorX, y, { width: colWidths[i] });
    cursorX += colWidths[i];
  });
  y += 18;

  doc.font("Helvetica").fontSize(10).fillColor("#000");
  rows.forEach(r => {
    cursorX = x;
    r.forEach((cell, i) => {
      doc.text(String(cell), cursorX, y, { width: colWidths[i] });
      cursorX += colWidths[i];
    });
    y += 16;
  });

  return y;
}

// Helper to prevent cutoff
function ensureSpace(doc, neededHeight) {
  if (doc.y + neededHeight > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

async function generateEventPDF({ day } = {}) {
  try {
    // Optional WHERE filter for exhibition day using central mapping
    const filterDate = day ? getDateForDay(day) : null;
    const whereDay = filterDate ? `WHERE DATE(e.start_time) = $1::date` : '';
    const params = filterDate ? [filterDate] : [];

    // ---- Queries ----
    const totalEventsRes = await pool.query(
      `SELECT COUNT(*)::int AS total_events FROM Events e ${whereDay};`,
      params
    );
    const eventsByOrganizerRes = await pool.query(`
      SELECT o.organizer_name, COUNT(e.event_id)::int AS event_count
      FROM Events e
      LEFT JOIN Organizer o ON e.organizer_id = o.organizer_id
      ${whereDay}
      GROUP BY o.organizer_name
      ORDER BY event_count DESC;
    `, params);
    const eventsByCategoryRes = await pool.query(`
      SELECT event_category, COUNT(*)::int AS count
      FROM Events e
      ${whereDay}
      GROUP BY event_category
      ORDER BY count DESC;
    `, params);
    const durationStatsRes = await pool.query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (end_time - start_time))/60)::numeric(10,2) AS avg_minutes,
        MIN(EXTRACT(EPOCH FROM (end_time - start_time))/60)::numeric(10,2) AS min_minutes,
        MAX(EXTRACT(EPOCH FROM (end_time - start_time))/60)::numeric(10,2) AS max_minutes
      FROM Events e
      ${whereDay};
    `, params);
    const eventsByHourRes = await pool.query(`
      SELECT EXTRACT(HOUR FROM start_time)::int AS hour, COUNT(*)::int AS count
      FROM Events e
      ${whereDay}
      GROUP BY hour
      ORDER BY hour;
    `, params);
    const speakerInvolvementRes = await pool.query(`
      SELECT s.speaker_name, COUNT(es.event_id)::int AS event_count
      FROM Event_Speaker es
      JOIN Speaker s ON es.speaker_id = s.speaker_id
      JOIN Events e ON es.event_id = e.event_id
      ${whereDay}
      GROUP BY s.speaker_name
      ORDER BY event_count DESC
      LIMIT 5;
    `, params);
    const tagUsageRes = await pool.query(`
      SELECT t.tag_name, COUNT(et.event_id)::int AS count
      FROM Event_Tag et
      JOIN Tag t ON et.tag_id = t.tag_id
      JOIN Events e ON et.event_id = e.event_id
      ${whereDay}
      GROUP BY t.tag_name
      ORDER BY count DESC
      LIMIT 5;
    `, params);

    // ---- Data ----
    const totalEvents = totalEventsRes.rows[0]?.total_events || 0;
    const byOrganizer = eventsByOrganizerRes.rows || [];
    const byCategory = eventsByCategoryRes.rows || [];
    const durations = durationStatsRes.rows[0] || {};
    const byHour = eventsByHourRes.rows || [];
    const speakerInvolvement = speakerInvolvementRes.rows || [];
    const tagUsage = tagUsageRes.rows || [];

    // ---- Charts ----
    let organizerChart = null, categoryChart = null, hourChart = null;

    if (byCategory.length) {
      categoryChart = await chartJSNodeCanvas.renderToBuffer({
        type: "pie",
        data: {
          labels: byCategory.map(r => r.event_category || "Uncategorized"),
          datasets: [{ data: byCategory.map(r => safeNum(r.count)), backgroundColor: ["#1976d2","#388e3c","#fbc02d","#d32f2f","#7b1fa2"] }]
        },
        options: { plugins: { legend: { position: "right" } } }
      });
    }

    if (byOrganizer.length) {
      organizerChart = await chartJSNodeCanvas.renderToBuffer({
        type: "bar",
        data: {
          labels: byOrganizer.map(r => r.organizer_name || "Unknown"),
          datasets: [{ data: byOrganizer.map(r => safeNum(r.event_count)), backgroundColor: "#1976d2" }]
        },
        options: { plugins: { legend: { display: false } } }
      });
    }

    if (byHour.length) {
      hourChart = await chartJSNodeCanvas.renderToBuffer({
        type: "bar",
        data: {
          labels: byHour.map(r => `${r.hour}:00`),
          datasets: [{ data: byHour.map(r => safeNum(r.count)), backgroundColor: "#f57c00" }]
        },
        options: { plugins: { legend: { display: false } } }
      });
    }

    // ---- PDF ----
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const suffix = day ? `_day${day}` : '';
    const filename = `event_summary${suffix}_${timestamp}.pdf`;
    const exportsDir = path.join(__dirname, "../../exports");
    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
    const filepath = path.join(exportsDir, filename);

    const doc = new PDFDocument({ margin: 36, size: "A4" });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Title
    const title = day ? `Event Summary Report - Day ${day}` : "Event Summary Report";
    doc.fontSize(20).fillColor("#0b4b8a").text(title, { align: "center" });
    doc.moveDown();
    doc.fontSize(11).fillColor("#666").text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
    if (filterDate) {
      doc.fontSize(10).fillColor("#666").text(`Filtered for: ${filterDate}`, { align: "center" });
    }
    doc.moveDown(1.5);

    // KPI Blocks
    drawKPIBlock(doc, "Total Events", totalEvents, 60, doc.y, 200, 70, "#1976d2");
    drawKPIBlock(doc, "Average Duration", fmtHours(durations.avg_minutes || 0), 300, doc.y, 200, 70, "#388e3c");
    doc.moveDown(5);
    drawKPIBlock(doc, "Shortest Event", fmtHours(durations.min_minutes || 0), 60, doc.y, 200, 70, "#fbc02d");
    drawKPIBlock(doc, "Longest Event", fmtHours(durations.max_minutes || 0), 300, doc.y, 200, 70, "#d32f2f");

    // Charts
    doc.addPage();

    // --- Events by Category ---
    if (categoryChart) {
      ensureSpace(doc, 300);
      doc.fontSize(14).fillColor("#0b4b8a").text("Events by Category", { underline: true });
      doc.fontSize(10).fillColor("#444").text("Distribution of events across categories.");
      doc.moveDown(0.5);
      doc.image(categoryChart, { fit: [CHART_WIDTH, CHART_HEIGHT], align: "center" });
      doc.moveDown(0.5);

      const totalCat = byCategory.reduce((a, b) => a + safeNum(b.count), 0);
      doc.fontSize(11).fillColor("#000").text("Category Breakdown:");
      byCategory.forEach(c => {
        const percent = ((c.count / totalCat) * 100).toFixed(1);
        doc.text(`- ${c.event_category || "Uncategorized"}: ${c.count} events (${percent}%)`);
      });
      doc.moveDown(1);
    }

    // --- Events per Organizer ---
    if (organizerChart) {
      ensureSpace(doc, 300);
      doc.fontSize(14).fillColor("#0b4b8a").text("Events per Organizer", { underline: true });
      doc.fontSize(10).fillColor("#444").text("Number of events managed by each organizer.");
      doc.moveDown(0.5);
      doc.image(organizerChart, { fit: [CHART_WIDTH, CHART_HEIGHT], align: "center" });
      doc.moveDown(0.5);

      doc.fontSize(11).fillColor("#000").text("Organizer Breakdown:");
      byOrganizer.forEach(o => {
        doc.text(`- ${o.organizer_name || "Unknown"}: ${o.event_count} events`);
      });
      doc.moveDown(1);
    }

    // --- Events by Start Hour ---
    if (hourChart) {
      ensureSpace(doc, 300);
      doc.fontSize(14).fillColor("#0b4b8a").text("Events by Start Hour", { underline: true });
      doc.fontSize(10).fillColor("#444").text("Distribution of events by hour of the day.");
      doc.moveDown(0.5);
      doc.image(hourChart, { fit: [CHART_WIDTH, CHART_HEIGHT], align: "center" });
      doc.moveDown(0.5);

      doc.fontSize(11).fillColor("#000").text("Start Hour Breakdown:");
      byHour.forEach(h => {
        doc.text(`- ${h.hour}:00 → ${h.count} events`);
      });
      doc.moveDown(1);
    }

    // Top 5 Speakers & Tags
    doc.addPage();
    doc.fontSize(16).fillColor("#0b4b8a").text("Top 5 Speakers & Tags", { underline: true });
    doc.moveDown(0.8);

    // Speakers table
    doc.fontSize(13).fillColor("#0b4b8a").text("Top 5 Speakers", 60, doc.y);
    let speakersY = drawTable(
      doc,
      ["Speaker", "Events"],
      speakerInvolvement.map(s => [s.speaker_name, s.event_count]),
      60,
      doc.y + 20,
      [200, 80]
    );
    doc.fontSize(9).fillColor("#666").text("These are the most active speakers by event participation.", 60, speakersY + 5);

    // Tags table
    let rightX = 330;
    doc.fontSize(13).fillColor("#0b4b8a").text("Top 5 Tags", rightX, doc.y - (speakerInvolvement.length * 16 + 50));
    let tagsY = drawTable(
      doc,
      ["Tag", "Usage"],
      tagUsage.map(t => [t.tag_name, t.count]),
      rightX,
      doc.y,
      [150, 80]
    );
    doc.fontSize(9).fillColor("#666").text("Most frequently used event tags.", rightX, tagsY + 5);

    doc.end();
    await new Promise(resolve => stream.on("finish", resolve));
    return filename;
  } catch (err) {
    console.error("Error generating Event Summary PDF:", err);
    throw err;
  }
}

module.exports = { generateEventPDF };
