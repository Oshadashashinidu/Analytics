const db = require("../utils/db");

// 1. Top 3 buildings
async function getTop3Buildings(date) {
  const query = `
    SELECT b.dept_name AS building, COUNT(DISTINCT e.qr_id) AS visitors
    FROM EntryExitLog e
    JOIN Building b ON e.building_id = b.building_id
    WHERE DATE(e.entry_time) = $1
    GROUP BY b.dept_name
    ORDER BY visitors DESC
    LIMIT 3
  `;
  const { rows } = await db.query(query, [date]);
  return rows;
}

// 2. Visitors in all buildings
async function getVisitorsInAllBuildings(date) {
  const query = `
    SELECT b.dept_name AS building, COUNT(DISTINCT e.qr_id) AS visitors
    FROM EntryExitLog e
    JOIN Building b ON e.building_id = b.building_id
    WHERE DATE(e.entry_time) = $1
    GROUP BY b.dept_name
    ORDER BY b.dept_name
  `;
  const { rows } = await db.query(query, [date]);
  return rows;
}

// 3. Average duration in most popular building
async function getAverageDurationMostPopular(date) {
  // Find most popular building
  const topQuery = `
    SELECT b.building_id, b.dept_name AS building, COUNT(DISTINCT e.qr_id) AS visitors
    FROM EntryExitLog e
    JOIN Building b ON e.building_id = b.building_id
    WHERE DATE(e.entry_time) = $1
    GROUP BY b.building_id, b.dept_name
    ORDER BY visitors DESC
    LIMIT 1
  `;
  const topRes = await db.query(topQuery, [date]);
  if (topRes.rows.length === 0) return null;
  const mostPopular = topRes.rows[0];

  // Calculate average duration in minutes
  const durQuery = `
    SELECT EXTRACT(EPOCH FROM (exit_time - entry_time)) / 60 AS duration
    FROM EntryExitLog
    WHERE building_id = $1 AND DATE(entry_time) = $2 AND exit_time IS NOT NULL
  `;
  const { rows } = await db.query(durQuery, [mostPopular.building_id, date]);
  if (rows.length === 0) return { building: mostPopular.building, averageDuration: 0 };

  const avg =
    rows.reduce((sum, r) => sum + Number(r.duration), 0) / rows.length;

  return { building: mostPopular.building, averageDuration: Math.round(avg) };
}

// 4. Repeat visitors in most popular building
async function getRepeatVisitorsMostPopular(date) {
  // Find most popular building
  const topQuery = `
    SELECT b.building_id, b.dept_name AS building, COUNT(DISTINCT e.qr_id) AS visitors
    FROM EntryExitLog e
    JOIN Building b ON e.building_id = b.building_id
    WHERE DATE(e.entry_time) = $1
    GROUP BY b.building_id, b.dept_name
    ORDER BY visitors DESC
    LIMIT 1
  `;
  const topRes = await db.query(topQuery, [date]);
  if (topRes.rows.length === 0) return null;
  const mostPopular = topRes.rows[0];

  // Count visits per person
  const visitQuery = `
    SELECT qr_id, COUNT(*) AS visits
    FROM EntryExitLog
    WHERE building_id = $1 AND DATE(entry_time) = $2
    GROUP BY qr_id
  `;
  const { rows } = await db.query(visitQuery, [mostPopular.building_id, date]);

  const totalVisitors = rows.length;
  const repeatVisitors = rows.filter(r => Number(r.visits) > 1).length;

  return {
    building: mostPopular.building,
    totalVisitors,
    repeatVisitors,
    repeatPercentage:
      totalVisitors > 0 ? (repeatVisitors / totalVisitors) * 100 : 0,
  };
}

module.exports = {
  getTop3Buildings,
  getVisitorsInAllBuildings,
  getAverageDurationMostPopular,
  getRepeatVisitorsMostPopular,
};
