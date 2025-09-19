const db = require("../utils/db");

// 1. Total visitors (count_per_day)
async function getTotalVisitors(buildingId, date) {
  let query, params;
  if (buildingId) {
    query = `SELECT dept_name, count_per_day AS total_visitors 
             FROM "BUILDING" 
             WHERE building_id = $1`;
    params = [buildingId];
  } else {
    query = `SELECT SUM(count_per_day) AS total_visitors FROM "BUILDING"`;
    params = [];
  }
  const { rows } = await db.query(query, params);
  return rows[0];
}

// 2. Total check-ins (real-time visitors, total_count)
async function getTotalCheckIns(buildingId, date) {
  let query, params;
  if (buildingId) {
    query = `SELECT dept_name, total_count AS total_checkins 
             FROM "BUILDING" 
             WHERE building_id = $1`;
    params = [buildingId];
  } else {
    query = `SELECT SUM(total_count) AS total_checkins FROM "BUILDING"`;
    params = [];
  }
  const { rows } = await db.query(query, params);
  return rows[0];
}

// 3. Average duration (unchanged, still uses EntryExitLog)
async function getAverageDuration(buildingId, date, slot) {
  const query = `
    SELECT EXTRACT(EPOCH FROM (exit_time - entry_time)) / 60 AS duration
    FROM "EntryExitLog"
    WHERE building_id = $1 
      AND DATE(entry_time) = $2
      AND exit_time IS NOT NULL
  `;
  const { rows } = await db.query(query, [buildingId, date]);
  if (rows.length === 0) return { averageDuration: 0 };

  const avg =
    rows.reduce((sum, r) => sum + Number(r.duration), 0) / rows.length;

  return { averageDuration: Math.round(avg) };
}

// 4. Repeat visitors (unchanged, still uses EntryExitLog)
async function getRepeatVisitors(buildingId, date, slot) {
  const query = `
    SELECT tag_id, COUNT(*) AS visits
    FROM "EntryExitLog"
    WHERE building_id = $1 AND DATE(entry_time) = $2
    GROUP BY tag_id
  `;
  const { rows } = await db.query(query, [buildingId, date]);

  const repeatVisitors = rows.filter(r => Number(r.visits) > 1).length;
  return { repeatVisitors };
}

// 5. Top 3 buildings (count_per_day)
async function getTop3Buildings(date) {
  const query = `
    SELECT dept_name AS building, count_per_day AS visitors
    FROM "BUILDING"
    ORDER BY count_per_day DESC, dept_name ASC
    LIMIT 3
  `;
  const { rows } = await db.query(query);
  return rows;
}

// 6. Top 10 buildings (count_per_day)
async function getVisitorsPerBuilding(date) {
  const query = `
    SELECT dept_name AS building, count_per_day AS total_visitors
    FROM "BUILDING"
    ORDER BY count_per_day DESC, dept_name ASC
    LIMIT 10
  `;
  const { rows } = await db.query(query);
  return rows;
}

module.exports = {
  getTotalVisitors,
  getTotalCheckIns,
  getAverageDuration,
  getRepeatVisitors,
  getTop3Buildings,
  getVisitorsPerBuilding
};
