const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const pool = require("../../../../db/db.js"); // adjust path

// ChartJS canvas setup
const width = 600;
const height = 400;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

async function generateAnalyticsPDF() {
  try {
    // Query 1: Visits per building
    const visitsResult = await pool.query(`
      SELECT b.dept_name, COUNT(*) AS total_visits,
             COUNT(DISTINCT l.tag_id) AS unique_visitors,
             AVG(EXTRACT(EPOCH FROM (COALESCE(l.exit_time, NOW()) - l.entry_time))/60) AS avg_time
      FROM EntryExitLog l
      JOIN Building b ON l.building_id = b.building_id
      GROUP BY b.dept_name
    `);

    const visitsData = visitsResult.rows;

    // Prepare chart data
    const labels = visitsData.map(r => r.dept_name);
    const totals = visitsData.map(r => Number(r.total_visits));
    const avgs = visitsData.map(r => Number(r.avg_time || 0));

    // Generate bar chart: Visits per building
    const barConfig = {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Total Visits",
          data: totals,
          backgroundColor: "#4285F4"
        }]
      },
      options: {
        responsive: false,
        plugins: { legend: { display: false }, title: { display: true, text: "Visitors per Building" } },
        scales: { y: { beginAtZero: true } }
      }
    };
    const barBuffer = await chartJSNodeCanvas.renderToBuffer(barConfig);

    // Generate pie chart: Average time spent
    const pieConfig = {
      type: "pie",
      data: {
        labels,
        datasets: [{
          data: avgs,
          backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4CAF50", "#9C27B0"]
        }]
      },
      options: {
        plugins: { title: { display: true, text: "Avg Time per Building (mins)" } }
      }
    };
    const pieBuffer = await chartJSNodeCanvas.renderToBuffer(pieConfig);

    // === PDF Generation ===
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `analytics_report_${timestamp}.pdf`;
    const exportsDir = path.join(__dirname, "../../exports");
    const filepath = path.join(exportsDir, filename);
    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(fs.createWriteStream(filepath));

    // Title
    doc.fontSize(20).text("Analytics Report", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("gray").text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown(1.5);

    // === Summary Table ===
    doc.fontSize(14).fillColor("black").text("Visits Overview", { underline: true });
    doc.moveDown(0.5);

    visitsData.forEach(r => {
      doc.fontSize(11).text(
        `${r.dept_name}: Total Visits = ${r.total_visits}, Unique Visitors = ${r.unique_visitors}, Avg Time = ${Number(r.avg_time || 0).toFixed(2)} mins`
      );
    });

    doc.addPage();

    // === Charts ===
    doc.fontSize(16).text("Visual Insights", { align: "center" });
    doc.moveDown(1);

    if (barBuffer) {
      doc.image(barBuffer, { fit: [500, 300], align: "center" });
      doc.moveDown(2);
    }

    if (pieBuffer) {
      doc.image(pieBuffer, { fit: [400, 300], align: "center" });
    }

    doc.end();
    console.log("Analytics PDF generated:", filepath);
    return filepath;
  } catch (err) {
    console.error("Error generating Analytics PDF:", err);
    throw err;
  }
}

module.exports = { generateAnalyticsPDF };
