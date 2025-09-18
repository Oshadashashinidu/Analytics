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
    FROM "EntryExitLog"
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
    FROM "EntryExitLog"
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
    FROM "EntryExitLog"
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
    FROM "EntryExitLog"
    WHERE building_id = $1 AND entry_time >= $2 AND entry_time < $3
    GROUP BY tag_id
  `;
  const { rows } = await db.query(query, [buildingId, start, end]);

  const totalVisitors = rows.length;
  const repeatVisitors = rows.filter(r => Number(r.visits) > 1).length;

  return {
       repeatVisitors
  };
}

// 5. Top 3 buildings during a slot
async function getTop3Buildings(date, slot) {
  const { start, end } = getSlotRange(date, slot);

  const query = `
    SELECT 
      b.dept_name AS building,
      COUNT(DISTINCT e.tag_id) AS visitors
    FROM "BUILDING" b
    LEFT JOIN "EntryExitLog" e 
      ON e.building_id = b.building_id
      AND e.entry_time >= $1 
      AND e.entry_time < $2
    GROUP BY b.dept_name
    ORDER BY visitors DESC, b.dept_name ASC
    LIMIT 3
  `;

  const { rows } = await db.query(query, [start, end]);
  return rows;
}


// 6. Total visitors per building for a time slot (for bar chart)
async function getVisitorsPerBuilding(date, slot) {
  const { start, end } = getSlotRange(date, slot);

  const query = `
    SELECT 
      b.dept_name AS building,
      COUNT(DISTINCT e.tag_id) AS total_visitors
    FROM "BUILDING" b
    LEFT JOIN "EntryExitLog" e 
      ON e.building_id = b.building_id
      AND e.entry_time >= $1 
      AND e.entry_time < $2
    GROUP BY b.dept_name
    ORDER BY total_visitors DESC
  `;

  const { rows } = await db.query(query, [start, end]);
  return rows;
}






// Helper
function calculatePercentageChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous * 100).toFixed(2);
}

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

// 1. Visitors Growth %
async function getVisitorsGrowth(buildingId, date, slot) {
  const { start, end } = getSlotRange(date, slot);

  const q = `
    SELECT COUNT(DISTINCT tag_id) AS total_visitors
    FROM "EntryExitLog"
    WHERE building_id = $1 AND entry_time >= $2 AND entry_time < $3
  `;
  const { rows: cRows } = await db.query(q, [buildingId, start, end]);
  const current = Number(cRows[0].total_visitors);

  const prevSlot = (Number(slot) - 1).toString();
  if (prevSlot === "0") return { current, growth: 0 };

  const { start: ps, end: pe } = getSlotRange(date, prevSlot);
  const { rows: pRows } = await db.query(q, [buildingId, ps, pe]);
  const previous = Number(pRows[0].total_visitors);

  return { growth: calculatePercentageChange(current, previous) };
}

// 2. Check-ins Growth %
async function getCheckInsGrowth(buildingId, date, slot) {
  const { start, end } = getSlotRange(date, slot);

  const q = `
    SELECT COUNT(*) AS total_checkins
    FROM "EntryExitLog"
    WHERE building_id = $1 AND entry_time >= $2 AND entry_time < $3
  `;
  const { rows: cRows } = await db.query(q, [buildingId, start, end]);
  const current = Number(cRows[0].total_checkins);

  const prevSlot = (Number(slot) - 1).toString();
  if (prevSlot === "0") return { current, growth: 0 };

  const { start: ps, end: pe } = getSlotRange(date, prevSlot);
  const { rows: pRows } = await db.query(q, [buildingId, ps, pe]);
  const previous = Number(pRows[0].total_checkins);

  return { growth: calculatePercentageChange(current, previous) };
}

// 3. Avg Duration Growth %
async function getAvgDurationGrowth(buildingId, date, slot) {
  const { start, end } = getSlotRange(date, slot);

  const q = `
    SELECT EXTRACT(EPOCH FROM (exit_time - entry_time)) / 60 AS duration
    FROM "EntryExitLog"
    WHERE building_id = $1 
      AND entry_time >= $2 AND entry_time < $3
      AND exit_time IS NOT NULL
  `;
  const { rows: cRows } = await db.query(q, [buildingId, start, end]);
  let current = 0;
  if (cRows.length > 0) {
    current = cRows.reduce((s, r) => s + Number(r.duration), 0) / cRows.length;
  }

  const prevSlot = (Number(slot) - 1).toString();
  if (prevSlot === "0") return { current: Math.round(current), growth: 0 };

  const { start: ps, end: pe } = getSlotRange(date, prevSlot);
  const { rows: pRows } = await db.query(q, [buildingId, ps, pe]);
  let previous = 0;
  if (pRows.length > 0) {
    previous = pRows.reduce((s, r) => s + Number(r.duration), 0) / pRows.length;
  }

  return {

    growth: calculatePercentageChange(current, previous)
  };
}



module.exports = {
  getTotalVisitors,
  getTotalCheckIns,
  getAverageDuration,
  getRepeatVisitors,
  getTop3Buildings,
  getVisitorsPerBuilding,
   getVisitorsGrowth,
  getCheckInsGrowth,
  getAvgDurationGrowth

};
