// services/attendanceCSV.js
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');
const pool = require('../../../../db/db.js'); // adjust path

async function generateAttendanceCSV() {
  try {
    const result = await pool.query(`
      SELECT
        l.log_id,
        p.person_id,
        p.name AS person_name,
        p.contact_info,
        r.tag_id,
        b.dept_name AS building_name,
        l.entry_time,
        l.exit_time,
        (EXTRACT(EPOCH FROM (l.exit_time - l.entry_time))/60)::numeric(10,2) AS duration_minutes
      FROM EntryExitLog l
      JOIN RFID_Tag r ON l.tag_id = r.tag_id
      JOIN Person p ON r.issued_to = p.person_id
      JOIN Building b ON l.building_id = b.building_id
      ORDER BY l.entry_time DESC;
    `);

    const rows = result.rows || [];

    const parser = new Parser();
    const csv = parser.parse(rows);

    const exportsDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });

    const filename = `attendance_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    const filepath = path.join(exportsDir, filename);
    fs.writeFileSync(filepath, csv, 'utf8');

    console.log('CSV written:', filepath);
    return filepath;
  } catch (err) {
    console.error('Error generateAttendanceCSV', err);
    throw err;
  }
}

module.exports = { generateAttendanceCSV };
