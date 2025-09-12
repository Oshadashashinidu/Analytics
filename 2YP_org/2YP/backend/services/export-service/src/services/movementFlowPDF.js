// src/services/movementFlowPDF.js
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

async function generateMovementFlowPDF() {
  try {
    // ---- Queries ----
    // Entry vs exit counts per slot
    const entryExitSlotsRes = await pool.query(`
      SELECT slot,
        SUM(entry_count)::int AS entries,
        SUM(exit_count)::int AS exits
      FROM (
        SELECT
          CASE
            WHEN entry_time::time >= '08:00'::time AND entry_time::time < '10:00'::time THEN '08-10'
            WHEN entry_time::time >= '10:00'::time AND entry_time::time < '12:00'::time THEN '10-12'
            WHEN entry_time::time >= '12:00'::time AND entry_time::time < '14:00'::time THEN '12-14'
            WHEN entry_time::time >= '14:00'::time AND entry_time::time < '16:00'::time THEN '14-16'
            ELSE 'other'
          END AS slot,
          1 AS entry_count,
          0 AS exit_count
        FROM EntryExitLog
        WHERE entry_time IS NOT NULL
      ) e
      GROUP BY slot
      ORDER BY slot;
    `);

    // Transition paths (zone-level) - count transitions zoneA->zoneB
    // We consider building_id's first char as zone.
    const transitionsRes = await pool.query(`
      WITH ordered AS (
        SELECT tag_id, building_id, entry_time,
               ROW_NUMBER() OVER (PARTITION BY tag_id ORDER BY entry_time) rn
        FROM EntryExitLog
        WHERE entry_time IS NOT NULL
      ),
      pairs AS (
        SELECT a.tag_id,
               SUBSTRING(a.building_id,1,1) AS from_zone,
               SUBSTRING(b.building_id,1,1) AS to_zone
        FROM ordered a
        JOIN ordered b ON a.tag_id = b.tag_id AND b.rn = a.rn + 1
        WHERE a.building_id IS NOT NULL AND b.building_id IS NOT NULL
      )
      SELECT from_zone, to_zone, COUNT(*)::int AS transitions
      FROM pairs
      GROUP BY from_zone, to_zone
      ORDER BY transitions DESC
      LIMIT 50;
    `);

    // Busiest buildings by entry count
    const busiestBuildingsRes = await pool.query(`
      SELECT b.dept_name, e.building_id, COUNT(*)::int AS entries
      FROM EntryExitLog e
      JOIN Building b ON e.building_id = b.building_id
      GROUP BY b.dept_name, e.building_id
      ORDER BY entries DESC
      LIMIT 50;
    `);

    // Busiest zones by unique visitors
    const busiestZonesRes = await pool.query(`
      SELECT zone, COUNT(DISTINCT tag_id)::int AS unique_visitors
      FROM (
        SELECT tag_id, SUBSTRING(building_id,1,1) AS zone FROM EntryExitLog WHERE building_id IS NOT NULL
      ) s
      GROUP BY zone
      ORDER BY unique_visitors DESC;
    `);

    // Avg number of distinct buildings visited per person
    const avgBuildingsPerPersonRes = await pool.query(`
      SELECT AVG(cnt)::numeric(10,2) AS avg_buildings
      FROM (
        SELECT tag_id, COUNT(DISTINCT building_id) AS cnt
        FROM EntryExitLog
        GROUP BY tag_id
      ) t;
    `);

    // First entry & last exit per person (sample top 50)
    const firstLastRes = await pool.query(`
      SELECT tag_id, MIN(entry_time) AS first_entry, MAX(exit_time) AS last_exit
      FROM EntryExitLog
      GROUP BY tag_id
      ORDER BY tag_id
      LIMIT 50;
    `);

    // ---- Prepare data ----
    const entryExitSlots = entryExitSlotsRes.rows || [];
    const transitions = transitionsRes.rows || [];
    const busiestBuildings = busiestBuildingsRes.rows || [];
    const busiestZones = busiestZonesRes.rows || [];
    const avgBuildingsPerPerson = avgBuildingsPerPersonRes.rows[0] ? Number(avgBuildingsPerPersonRes.rows[0].avg_buildings) : 0;
    const firstLast = firstLastRes.rows || [];

    // charts data
    const slotLabels = entryExitSlots.map(r => r.slot);
    const slotEntries = entryExitSlots.map(r => safeNum(r.entries));
    const slotExits = entryExitSlots.map(r => safeNum(r.exits));
    const transitionLabels = transitions.map(r => `${r.from_zone}->${r.to_zone}`);
    const transitionValues = transitions.map(r => safeNum(r.transitions));
    const busiestBuildingLabels = busiestBuildings.map(r => r.dept_name);
    const busiestBuildingValues = busiestBuildings.map(r => safeNum(r.entries));
    const busiestZoneLabels = busiestZones.map(r => r.zone);
    const busiestZoneValues = busiestZones.map(r => safeNum(r.unique_visitors));

    // ---- Chart rendering ----
    let slotBuffer = null, transitionBuffer = null, busiestBuffer = null, zoneBuffer = null;
    try {
      if (slotLabels.length) {
        slotBuffer = await chartJSNodeCanvas.renderToBuffer({
          type: "bar",
          data: {
            labels: slotLabels,
            datasets: [
              { label: "Entries", data: slotEntries },
              { label: "Exits", data: slotExits }
            ]
          },
          options: { responsive: false }
        });
      }
      if (transitionLabels.length) {
        transitionBuffer = await chartJSNodeCanvas.renderToBuffer({
          type: "bar",
          data: { labels: transitionLabels, datasets: [{ data: transitionValues }] },
          options: { responsive: false, plugins: { legend: { display: false } } }
        });
      }
      if (busiestBuildingLabels.length) {
        busiestBuffer = await chartJSNodeCanvas.renderToBuffer({
          type: "bar",
          data: { labels: busiestBuildingLabels, datasets: [{ data: busiestBuildingValues }] },
          options: { responsive: false }
        });
      }
      if (busiestZoneLabels.length) {
        zoneBuffer = await chartJSNodeCanvas.renderToBuffer({
          type: "pie",
          data: { labels: busiestZoneLabels, datasets: [{ data: busiestZoneValues }] },
          options: { responsive: false }
        });
      }
    } catch(err){
      console.error("Chart render error:", err);
    }

    // ---- Build PDF ----
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `movement_flow_${timestamp}.pdf`;
    const exportsDir = path.join(__dirname, "../../exports");
    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
    const filepath = path.join(exportsDir, filename);

    const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    doc.fontSize(20).fillColor("#0b4b8a").text("Movement & Flow Report", { align: "left" });
    doc.fontSize(10).fillColor("#666").text(`Generated: ${new Date().toLocaleString()}`, { align: "left" });
    doc.moveDown();

    doc.fontSize(14).fillColor("#0b4b8a").text("Summary", { underline: true });
    doc.moveDown(0.2);
    const summary = [
      `Avg distinct buildings visited per person: ${avgBuildingsPerPerson}`,
      `Sample transitions captured: ${transitionLabels.slice(0,5).join(", ") || "N/A"}`
    ];
    doc.fontSize(11).list(summary, { bulletRadius: 3 });

    doc.moveDown();
    if (slotBuffer) {
      doc.fontSize(12).text("Entries vs Exits per Time Slot", { align: "left" });
      doc.image(slotBuffer, { fit: [650, 240], align: "center" });
      doc.moveDown();
    }
    if (transitionBuffer) {
      doc.fontSize(12).text("Top Zone → Zone Transitions", { align: "left" });
      doc.image(transitionBuffer, { fit: [700, 220], align: "center" });
      doc.moveDown();
    }

    doc.addPage();
    if (busiestBuffer) {
      doc.fontSize(12).text("Busiest Buildings (by entries)", { align: "left" });
      doc.image(busiestBuffer, { fit: [700, 240], align: "center" });
      doc.moveDown();
    }
    if (zoneBuffer) {
      doc.addPage();
      doc.fontSize(12).text("Busiest Zones (unique visitors)", { align: "left" });
      doc.image(zoneBuffer, { fit: [450, 300], align: "center" });
      doc.moveDown();
    }

    doc.addPage();
    doc.fontSize(14).text("Sample First Entry & Last Exit (per tag_id)", { underline: true });
    doc.moveDown(0.2);
    const headers = ["tag_id", "first_entry", "last_exit"];
    const rows = firstLast.map(r => ({ tag_id: String(r.tag_id), first_entry: fmtDate(r.first_entry), last_exit: fmtDate(r.last_exit) }));
    // simple table draw
    const startX = doc.x;
    const totalW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colW = Math.floor(totalW / headers.length);
    let x = startX;
    doc.font("Helvetica-Bold").fontSize(10);
    headers.forEach(h => { doc.text(h, x + 4, doc.y, { width: colW - 8 }); x += colW; });
    doc.moveDown();
    doc.font("Helvetica").fontSize(10);
    rows.forEach(r => {
      x = startX;
      headers.forEach(h => {
        doc.text(r[h], x + 4, doc.y, { width: colW - 8 });
        x += colW;
      });
      doc.moveDown();
    });

    doc.end();
    await new Promise((resolve, reject) => { stream.on("finish", resolve); stream.on("error", reject); });

    return filepath;
  } catch (err) {
    console.error("Error generating Movement & Flow PDF:", err);
    throw err;
  }
}

module.exports = { generateMovementFlowPDF };
