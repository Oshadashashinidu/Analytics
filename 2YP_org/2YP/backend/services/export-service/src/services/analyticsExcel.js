// services/analyticsExcel.js
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const pool = require('../../../../db/db.js'); // adjust path

async function generateAnalyticsExcel() {
  try {
    const [
      totalVisits,
      uniqueVisitors,
      avgTime,
      longestStay,
      busiestHour,
      liveOccupancy,
      inactiveTags,
      afterHours
    ] = await Promise.all([
      pool.query(`
        SELECT b.dept_name, COUNT(*) AS total_visits
        FROM EntryExitLog l
        JOIN Building b ON l.building_id = b.building_id
        GROUP BY b.dept_name;
      `),
      pool.query(`
        SELECT b.dept_name, COUNT(DISTINCT r.issued_to) AS unique_visitors
        FROM EntryExitLog l
        JOIN Building b ON l.building_id = b.building_id
        JOIN RFID_Tag r ON l.tag_id = r.tag_id
        GROUP BY b.dept_name;
      `),
      pool.query(`
        SELECT b.dept_name, ROUND(AVG(EXTRACT(EPOCH FROM (l.exit_time - l.entry_time))/60)::numeric,2) AS avg_minutes
        FROM EntryExitLog l
        JOIN Building b ON l.building_id = b.building_id
        WHERE l.exit_time IS NOT NULL
        GROUP BY b.dept_name;
      `),
      pool.query(`
        SELECT p.name, ROUND(MAX(EXTRACT(EPOCH FROM (l.exit_time - l.entry_time))/60)::numeric,2) AS minutes
        FROM EntryExitLog l
        JOIN RFID_Tag r ON l.tag_id = r.tag_id
        JOIN Person p ON r.issued_to = p.person_id
        WHERE l.exit_time IS NOT NULL
        GROUP BY p.name
        ORDER BY minutes DESC
        LIMIT 10;
      `),
      pool.query(`
        SELECT DATE_PART('hour', entry_time)::int AS hour, COUNT(*) AS entries
        FROM EntryExitLog
        GROUP BY hour
        ORDER BY entries DESC
        LIMIT 5;
      `),
      pool.query(`
        SELECT b.dept_name, COUNT(*) AS current_inside
        FROM EntryExitLog l
        JOIN Building b ON l.building_id = b.building_id
        WHERE l.exit_time IS NULL
        GROUP BY b.dept_name;
      `),
      pool.query(`
        SELECT r.tag_id, p.name, MAX(l.entry_time) AS last_seen
        FROM RFID_Tag r
        LEFT JOIN Person p ON r.issued_to = p.person_id
        LEFT JOIN EntryExitLog l ON l.tag_id = r.tag_id
        GROUP BY r.tag_id, p.name
        HAVING MAX(l.entry_time) < NOW() - INTERVAL '30 days' OR MAX(l.entry_time) IS NULL;
      `),
      pool.query(`
        SELECT p.name, l.entry_time, b.dept_name
        FROM EntryExitLog l
        JOIN RFID_Tag r ON l.tag_id = r.tag_id
        JOIN Person p ON r.issued_to = p.person_id
        JOIN Building b ON l.building_id = b.building_id
        WHERE EXTRACT(HOUR FROM l.entry_time) < 8 OR EXTRACT(HOUR FROM l.entry_time) >= 18
        ORDER BY l.entry_time DESC
        LIMIT 200;
      `)
    ]);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Analytics');

    const addTable = (title, rows, cols) => {
      sheet.addRow([title]);
      sheet.addRow(cols.map(c => c.header));
      rows.forEach(r => sheet.addRow(cols.map(c => r[c.key])));
      sheet.addRow([]);
    };

    addTable('Total Visits per Building', totalVisits.rows, [
      { header: 'Building', key: 'dept_name' },
      { header: 'Total Visits', key: 'total_visits' }
    ]);

    addTable('Unique Visitors per Building', uniqueVisitors.rows, [
      { header: 'Building', key: 'dept_name' },
      { header: 'Unique Visitors', key: 'unique_visitors' }
    ]);

    addTable('Average Time per Building (mins)', avgTime.rows, [
      { header: 'Building', key: 'dept_name' },
      { header: 'Avg Minutes', key: 'avg_minutes' }
    ]);

    addTable('Longest Stay (Top 10)', longestStay.rows, [
      { header: 'Person', key: 'name' },
      { header: 'Minutes', key: 'minutes' }
    ]);

    addTable('Busiest Hours', busiestHour.rows, [
      { header: 'Hour', key: 'hour' },
      { header: 'Entries', key: 'entries' }
    ]);

    addTable('Live Occupancy', liveOccupancy.rows, [
      { header: 'Building', key: 'dept_name' },
      { header: 'Inside Now', key: 'current_inside' }
    ]);

    addTable('Inactive RFID Tags (30 days)', inactiveTags.rows, [
      { header: 'Tag ID', key: 'tag_id' },
      { header: 'Person', key: 'name' },
      { header: 'Last Seen', key: 'last_seen' }
    ]);

    addTable('After-hours Entries', afterHours.rows, [
      { header: 'Person', key: 'name' },
      { header: 'Entry Time', key: 'entry_time' },
      { header: 'Building', key: 'dept_name' }
    ]);

    const exportsDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });

    const filename = `analytics_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
    const filepath = path.join(exportsDir, filename);

    await workbook.xlsx.writeFile(filepath);
    console.log('Analytics Excel written:', filepath);
    return filepath;
  } catch (err) {
    console.error('Error generateAnalyticsExcel', err);
    throw err;
  }
}

module.exports = { generateAnalyticsExcel };
