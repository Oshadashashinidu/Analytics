// src/services/eventSummaryPDF.js
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const pool = require("../utils/db2.js");
const { getDateForDay } = require("../utils/dates");

const CHART_WIDTH = 800;
const CHART_HEIGHT = 400;
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width: CHART_WIDTH,
  height: CHART_HEIGHT,
});

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function generateEventPDF({ day } = {}) {
  try {
    const filterDate = day ? getDateForDay(day) : null;
    const whereDay = filterDate ? `WHERE DATE(start_time) = $1::date` : "";
    const params = filterDate ? [filterDate] : [];

    // --- Queries ---
    const summaryRes = await pool.query(
      `
      SELECT COUNT(*)::int AS total_events,
             AVG(EXTRACT(EPOCH FROM (end_time - start_time))/60)::numeric(10,2) AS avg_duration,
             MIN(start_time) AS first_event,
             MAX(end_time) AS last_event
      FROM Events
      ${whereDay};
    `,
      params
    );

    const categoryRes = await pool.query(
      `
      SELECT cat AS category_name, COUNT(*)::int AS event_count
      FROM Events e
      CROSS JOIN LATERAL unnest(e.event_categories) AS cat
      ${whereDay}
      GROUP BY cat
      ORDER BY event_count DESC;
    `,
      params
    );

    const eventsByLocationRes = await pool.query(
      `
      SELECT location, COUNT(*)::int AS event_count
      FROM Events e
      ${whereDay}
      GROUP BY location
      ORDER BY event_count DESC;
    `,
      params
    );

    const hourlyRes = await pool.query(
      `
      SELECT EXTRACT(HOUR FROM start_time)::int AS hour, COUNT(*)::int AS cnt
      FROM Events
      ${whereDay}
      GROUP BY hour
      ORDER BY hour;
    `,
      params
    );

    // --- Data extraction ---
    const summary =
      summaryRes.rows[0] || {
        total_events: 0,
        avg_duration: 0,
        first_event: null,
        last_event: null,
      };
    const byCategory = categoryRes.rows || [];
    const byLocation = eventsByLocationRes.rows || [];
    const byHour = hourlyRes.rows || [];

    // --- Charts ---
    let categoryChart = null,
      locationChart = null,
      hourlyChart = null;

    if (byCategory.length) {
      categoryChart = await chartJSNodeCanvas.renderToBuffer({
        type: "pie",
        data: {
          labels: byCategory.map((r) => r.category_name || "Uncategorized"),
          datasets: [
            {
              data: byCategory.map((r) => safeNum(r.event_count)),
              backgroundColor: [
                "#4e79a7",
                "#f28e2b",
                "#e15759",
                "#76b7b2",
                "#59a14f",
                "#edc949",
              ],
            },
          ],
        },
        options: { responsive: false },
      });
    }

    if (byLocation.length) {
      locationChart = await chartJSNodeCanvas.renderToBuffer({
        type: "bar",
        data: {
          labels: byLocation.map((r) => r.location || "Unknown"),
          datasets: [
            {
              data: byLocation.map((r) => safeNum(r.event_count)),
              backgroundColor: "#1976d2",
            },
          ],
        },
        options: { responsive: false, plugins: { legend: { display: false } } },
      });
    }

    if (byHour.length) {
      hourlyChart = await chartJSNodeCanvas.renderToBuffer({
        type: "bar",
        data: {
          labels: byHour.map((r) => `${r.hour}:00`),
          datasets: [
            {
              label: "Events",
              data: byHour.map((r) => safeNum(r.cnt)),
              backgroundColor: "#59a14f",
            },
          ],
        },
        options: { responsive: false },
      });
    }

    // --- PDF Build ---
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `event_summary_${timestamp}.pdf`;
    const exportsDir = path.join(__dirname, "../../exports");
    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
    const filepath = path.join(exportsDir, filename);

    const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Title
    doc.fontSize(20).fillColor("#0b4b8a").text("Event Summary Report", {
      align: "left",
    });
    doc
      .fontSize(10)
      .fillColor("#666")
      .text(`Generated: ${new Date().toLocaleString()}`, { align: "left" });
    doc.moveDown();

    // --- KPI Layout (Even Spacing) ---
    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const kpiCount = 4;
    const boxWidth = 180;
    const boxHeight = 80;
    const spacing = (pageWidth - kpiCount * boxWidth) / (kpiCount - 1);

    function drawKPI(x, y, title, value) {
      doc
        .rect(x, y, boxWidth, boxHeight)
        .fillColor("#f2f6fc")
        .fill()
        .strokeColor("#0b4b8a")
        .lineWidth(1)
        .stroke();
      doc
        .fillColor("#0b4b8a")
        .fontSize(11)
        .text(title, x + 5, y + 8, { width: boxWidth - 10, align: "center" });
      doc
        .fontSize(16)
        .fillColor("#000")
        .text(String(value), x + 5, y + 30, {
          width: boxWidth - 10,
          align: "center",
        });
    }

    const startX = doc.page.margins.left;
    const startY = 100;

    drawKPI(startX, startY, "Total Events", summary.total_events);
    drawKPI(
      startX + (boxWidth + spacing) * 1,
      startY,
      "Avg Duration (min)",
      Number(summary.avg_duration).toFixed(2)
    );
    drawKPI(
      startX + (boxWidth + spacing) * 2,
      startY,
      "First Event",
      summary.first_event
        ? new Date(summary.first_event).toLocaleString()
        : "N/A"
    );
    drawKPI(
      startX + (boxWidth + spacing) * 3,
      startY,
      "Last Event",
      summary.last_event
        ? new Date(summary.last_event).toLocaleString()
        : "N/A"
    );

    // Category chart
    if (categoryChart) {
      doc.addPage();
      doc
        .fontSize(14)
        .fillColor("#0b4b8a")
        .text("Events by Category", { underline: true });
      doc.image(categoryChart, { fit: [CHART_WIDTH, CHART_HEIGHT] });
      byCategory.forEach((c) => {
        doc
          .fontSize(11)
          .fillColor("#000")
          .text(`${c.category_name}: ${c.event_count} events`);
      });
    }

    // Location chart
    if (locationChart) {
      doc.addPage();
      doc
        .fontSize(14)
        .fillColor("#0b4b8a")
        .text("Events by Location", { underline: true });
      doc.image(locationChart, { fit: [CHART_WIDTH, CHART_HEIGHT] });
      byLocation.forEach((l) => {
        doc
          .fontSize(11)
          .fillColor("#000")
          .text(`${l.location}: ${l.event_count} events`);
      });
    }

    // Hourly chart
    if (hourlyChart) {
      doc.addPage();
      doc
        .fontSize(14)
        .fillColor("#0b4b8a")
        .text("Events by Start Hour", { underline: true });
      doc.image(hourlyChart, { fit: [CHART_WIDTH, CHART_HEIGHT] });
      byHour.forEach((h) => {
        doc
          .fontSize(11)
          .fillColor("#000")
          .text(`${h.hour}:00 - ${h.cnt} events`);
      });
    }

    doc.end();
    await new Promise((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });
    return filepath;
  } catch (err) {
    console.error("Error generating Event Summary PDF:", err);
    throw err;
  }
}

module.exports = { generateEventPDF };
