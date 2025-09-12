// src/services/securityExceptionPDF.js
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const pool = require("../../../../db/db.js"); // adjust as needed

const CHART_WIDTH = 900;
const CHART_HEIGHT = 420;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: CHART_WIDTH, height: CHART_HEIGHT });

function safeNum(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }
function fmtDate(ts){ if(!ts) return ""; return new Date(ts).toLocaleString(); }

async function generateSecurityExceptionPDF(options = {}) {
  try {
    // options thresholds
    const overstayMinutes = options.overstayMinutes || 240; // 4 hours default
    const highFreqThreshold = options.highFreqThreshold || 10; // visits/day threshold default
    const congestionThreshold = options.congestionThreshold || 20; // simple threshold

    // After-hours entries (outside 08:00 - 16:00)
    const afterHoursRes = await pool.query(`
      SELECT tag_id, building_id, entry_time
      FROM EntryExitLog
      WHERE (entry_time::time < '08:00'::time OR entry_time::time >= '16:00'::time)
      ORDER BY entry_time DESC
      LIMIT 200;
    `);

    // Overstays (exit - entry > overstayMinutes)
    const overstayRes = await pool.query(`
      SELECT tag_id, building_id, entry_time, exit_time,
             EXTRACT(EPOCH FROM (exit_time - entry_time))/60 AS minutes
      FROM EntryExitLog
      WHERE exit_time IS NOT NULL
        AND EXTRACT(EPOCH FROM (exit_time - entry_time))/60 > $1
      ORDER BY minutes DESC
      LIMIT 200;
    `, [overstayMinutes]);

    // Missing exits (exit_time IS NULL)
    const missingExitRes = await pool.query(`
      SELECT tag_id, building_id, entry_time
      FROM EntryExitLog
      WHERE exit_time IS NULL
      ORDER BY entry_time DESC
      LIMIT 200;
    `);

    // High frequency visitors per day (group by tag_id and date)
    const highFreqRes = await pool.query(`
      SELECT tag_id, DATE(entry_time) AS day, COUNT(*)::int AS visits
      FROM EntryExitLog
      GROUP BY tag_id, DATE(entry_time)
      HAVING COUNT(*) >= $1
      ORDER BY visits DESC
      LIMIT 200;
    `, [highFreqThreshold]);

    // After-hours by building (count)
    const afterHoursByBuildingRes = await pool.query(`
      SELECT b.dept_name, e.building_id, COUNT(*)::int AS after_entries
      FROM EntryExitLog e
      JOIN Building b ON e.building_id = b.building_id
      WHERE (e.entry_time::time < '08:00'::time OR e.entry_time::time >= '16:00'::time)
      GROUP BY b.dept_name, e.building_id
      ORDER BY after_entries DESC
      LIMIT 50;
    `);

    // Congestion approximation: count entries per building per slot and flag > threshold
    const congestionRes = await pool.query(`
      SELECT building_id, slot, COUNT(*)::int AS cnt
      FROM (
        SELECT building_id,
         CASE
           WHEN entry_time::time >= '08:00'::time AND entry_time::time < '10:00'::time THEN '08-10'
           WHEN entry_time::time >= '10:00'::time AND entry_time::time < '12:00'::time THEN '10-12'
           WHEN entry_time::time >= '12:00'::time AND entry_time::time < '14:00'::time THEN '12-14'
           WHEN entry_time::time >= '14:00'::time AND entry_time::time < '16:00'::time THEN '14-16'
           ELSE 'other'
         END AS slot
        FROM EntryExitLog
        WHERE building_id IS NOT NULL
      ) s
      GROUP BY building_id, slot
      HAVING COUNT(*) >= $1
      ORDER BY cnt DESC
      LIMIT 200;
    `, [congestionThreshold]);

    const afterHours = afterHoursRes.rows || [];
    const overstays = overstayRes.rows || [];
    const missingExits = missingExitRes.rows || [];
    const highFreq = highFreqRes.rows || [];
    const afterHoursByBuilding = afterHoursByBuildingRes.rows || [];
    const congestion = congestionRes.rows || [];

    // Charts: after-hours by building (bar); overstays (bar)
    const afterBuildingLabels = afterHoursByBuilding.map(r => r.dept_name);
    const afterBuildingValues = afterHoursByBuilding.map(r => safeNum(r.after_entries));
    const overstayLabels = overstays.map(r => String(r.tag_id)).slice(0,30);
    const overstayValues = overstays.map(r => safeNum(r.minutes)).slice(0,30);

    let afterBuffer = null, overstayBuffer = null;
    try {
      if (afterBuildingLabels.length) {
        afterBuffer = await chartJSNodeCanvas.renderToBuffer({
          type: "bar",
          data: { labels: afterBuildingLabels, datasets: [{ data: afterBuildingValues }] },
          options: { responsive: false }
        });
      }
      if (overstayLabels.length) {
        overstayBuffer = await chartJSNodeCanvas.renderToBuffer({
          type: "bar",
          data: { labels: overstayLabels, datasets: [{ data: overstayValues }] },
          options: { responsive: false }
        });
      }
    } catch(err){
      console.error("Chart render error:", err);
    }

    // ---- Build PDF ----
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `security_exception_${timestamp}.pdf`;
    const exportsDir = path.join(__dirname, "../../exports");
    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
    const filepath = path.join(exportsDir, filename);

    const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    doc.fontSize(20).fillColor("#b71c1c").text("Security & Exception Report", { align: "left" });
    doc.fontSize(10).fillColor("#666").text(`Generated: ${new Date().toLocaleString()}`, { align: "left" });
    doc.moveDown();

    doc.fontSize(14).fillColor("#b71c1c").text("Summary (thresholds)", { underline: true });
    doc.moveDown(0.2);
    const summary = [
      `Overstay threshold: ${overstayMinutes} minutes`,
      `High-frequency threshold (visits/day): ${highFreqThreshold}`,
      `Congestion threshold (entries per building per slot): ${congestionThreshold}`
    ];
    doc.fontSize(11).list(summary, { bulletRadius: 3 });
    doc.moveDown();

    doc.fontSize(12).text("After-hours Entries (recent)", { underline: true });
    doc.moveDown(0.2);
    afterHours.slice(0,100).forEach(r => {
      doc.fontSize(10).text(`tag:${r.tag_id} | building:${r.building_id} | entry:${fmtDate(r.entry_time)}`);
    });
    doc.addPage();

    doc.fontSize(12).text("Overstays (long durations)", { underline: true });
    doc.moveDown(0.2);
    overstays.slice(0,100).forEach(r => {
      doc.fontSize(10).text(`tag:${r.tag_id} | b:${r.building_id} | in:${fmtDate(r.entry_time)} | out:${fmtDate(r.exit_time)} | ${Math.round(r.minutes)} mins`);
    });

    if (overstayBuffer) {
      doc.moveDown(0.5);
      doc.image(overstayBuffer, { fit: [700, 240], align: "center" });
    }

    doc.addPage();
    doc.fontSize(12).text("Missing Exits (currently open sessions)", { underline: true });
    doc.moveDown(0.2);
    missingExits.slice(0,200).forEach(r => {
      doc.fontSize(10).text(`tag:${r.tag_id} | building:${r.building_id} | entry:${fmtDate(r.entry_time)}`);
    });

    doc.addPage();
    doc.fontSize(12).text("High Frequency Visitors (per day)", { underline: true });
    doc.moveDown(0.2);
    highFreq.slice(0,200).forEach(r => {
      doc.fontSize(10).text(`tag:${r.tag_id} | day:${r.day} | visits:${r.visits}`);
    });

    doc.addPage();
    doc.fontSize(12).text("After-hours Entries by Building", { underline: true });
    doc.moveDown(0.2);
    afterHoursByBuilding.slice(0,200).forEach(r => {
      doc.fontSize(10).text(`building:${r.dept_name || r.building_id} | after_entries:${r.after_entries}`);
    });
    if (afterBuffer) {
      doc.moveDown(0.5);
      doc.image(afterBuffer, { fit: [700, 240], align: "center" });
    }

    doc.addPage();
    doc.fontSize(12).text("Congestion Alerts (building & slot)", { underline: true });
    doc.moveDown(0.2);
    congestion.slice(0,200).forEach(r => {
      doc.fontSize(10).text(`building:${r.building_id} | slot:${r.slot} | entries:${r.cnt}`);
    });

    doc.end();
    await new Promise((resolve, reject) => { stream.on("finish", resolve); stream.on("error", reject); });

    return filepath;
  } catch (err) {
    console.error("Error generating Security & Exception PDF:", err);
    throw err;
  }
}

module.exports = { generateSecurityExceptionPDF };
