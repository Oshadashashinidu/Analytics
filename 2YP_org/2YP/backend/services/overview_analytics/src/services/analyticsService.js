const db = require("../utils/db");

// Helper to get slot range
function getSlotRange(date, slot) {
  let start, end;
  if (slot === "1") {
    start = `${date} 10:00:00`;
    end = `${date} 13:00:00`;
  } else if (slot === "2") {
    start = `${date} 13:00:00`;
    end = `${date} 16:00:00`;
  } else if (slot === "3") {
    start = `${date} 16:00:00`;
    end = `${date} 19:00:00`;
  } else {
    throw new Error("Invalid slot. Use 1, 2, or 3.");
  }
  return { start, end };
}

// 1. Total visitors (unique) in a building during a slot
async function getTotalVisitors(buildingId, date, slot) {
  const { start, end } = getSlotRange(date, slot);
  const query = `
    SELECT COUNT(DISTINCT tag_id) AS total_visitors
    FROM EntryExitLog
    WHERE building_id = $1 AND entry_time >= $2 AND entry_time < $3
  `;
  const { rows } = await db.query(query, [buildingId, start, end]);
  return rows[0];
}

// 2. Total check-ins (all entries) in a building during a slot
async function getTotalCheckIns(buildingId, date, slot) {
  const { start, end } = getSlotRange(date, slot);
  const query = `
    SELECT COUNT(*) AS total_checkins
    FROM EntryExitLog
    WHERE building_id = $1 AND entry_time >= $2 AND entry_time < $3
  `;
  const { rows } = await db.query(query, [buildingId, start, end]);
  return rows[0];
}

// 3. Average duration in a building during a slot
async function getAverageDuration(buildingId, date, slot) {
  const { start, end } = getSlotRange(date, slot);
  const query = `
    SELECT EXTRACT(EPOCH FROM (exit_time - entry_time)) / 60 AS duration
    FROM EntryExitLog
    WHERE building_id = $1 
      AND entry_time >= $2 AND entry_time < $3
      AND exit_time IS NOT NULL
  `;
  const { rows } = await db.query(query, [buildingId, start, end]);
  if (rows.length === 0) return { averageDuration: 0 };

  const avg =
    rows.reduce((sum, r) => sum + Number(r.duration), 0) / rows.length;

  return { averageDuration: Math.round(avg) };
}

// 4. Repeat visitors in a building during a slot
async function getRepeatVisitors(buildingId, date, slot) {
  const { start, end } = getSlotRange(date, slot);
  const query = `
    SELECT tag_id, COUNT(*) AS visits
    FROM EntryExitLog
    WHERE building_id = $1 AND entry_time >= $2 AND entry_time < $3
    GROUP BY tag_id
  `;
  const { rows } = await db.query(query, [buildingId, start, end]);

  const totalVisitors = rows.length;
  const repeatVisitors = rows.filter(r => Number(r.visits) > 1).length;

  return {
    totalVisitors,
    repeatVisitors,
    repeatPercentage: totalVisitors > 0 ? (repeatVisitors / totalVisitors) * 100 : 0,
  };
}

// 5. Top 3 buildings during a slot
async function getTop3Buildings(date, slot) {
  const { start, end } = getSlotRange(date, slot);
  const query = `
    SELECT b.dept_name AS building, COUNT(DISTINCT e.tag_id) AS visitors
    FROM EntryExitLog e
    JOIN Building b ON e.building_id = b.building_id
    WHERE e.entry_time >= $1 AND e.entry_time < $2
    GROUP BY b.dept_name
    ORDER BY visitors DESC
    LIMIT 3
  `;
  const { rows } = await db.query(query, [start, end]);
  return rows;
}

module.exports = {
  getTotalVisitors,
  getTotalCheckIns,
  getAverageDuration,
  getRepeatVisitors,
  getTop3Buildings
};
