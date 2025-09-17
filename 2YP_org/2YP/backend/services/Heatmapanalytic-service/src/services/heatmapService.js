const pool = require('../utils/db');

function validateDuration(durationHours) {
  const hours = parseInt(durationHours, 10);
  if (isNaN(hours) || hours <= 0 || hours > 168) return 24;
  return hours;
}

async function getPeakOccupancyByZone(durationHours, zone) {
  const hours = validateDuration(durationHours);
  const query = `
    WITH events AS (
      SELECT "entry_time" AS event_time,
        CASE WHEN "direction" = 'entry' THEN 1 ELSE -1 END AS change,
        "building_id" AS building
      FROM "EntryExitLog"
      WHERE "building_id" IN (
        SELECT "building_id" FROM "BUILDING" WHERE "dept_name" = $1
      )
      AND "entry_time" >= NOW() - INTERVAL '${hours} hours'
    ),
    runningsum AS (
      SELECT event_time,
        building,
        SUM(change) OVER (PARTITION BY building ORDER BY event_time ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS occupancy
      FROM events
    )
    SELECT building,
      COALESCE(MAX(occupancy), 0) AS peak_occupancy
    FROM runningsum
    GROUP BY building
    ORDER BY building;
  `;

  const { rows } = await pool.query(query, [zone]);
  if (!rows.length) {
    return [{ building: null, peak_occupancy: 0 }];
  }
  return rows;
}

async function getAvgDwellTimeByZone(durationHours, zone) {
  const hours = validateDuration(durationHours);
  const query = `
    WITH visits AS (
      SELECT "tag_id",
        "building_id" AS building,
        MIN("entry_time") AS entry_time,
        MAX("exit_time") AS exit_time
      FROM "EntryExitLog"
      WHERE "building_id" IN (
        SELECT "building_id" FROM "BUILDING" WHERE "dept_name" = $1
      )
      AND "entry_time" >= NOW() - INTERVAL '${hours} hours'
      GROUP BY "tag_id", "building_id"
    )
    SELECT building,
      COALESCE(AVG(EXTRACT(EPOCH FROM (exit_time - entry_time)) / 60), 0) AS avg_dwell_minutes
    FROM visits
    WHERE entry_time IS NOT NULL AND exit_time IS NOT NULL
    GROUP BY building
    ORDER BY building;
  `;

  const { rows } = await pool.query(query, [zone]);
  if (!rows.length) {
    return [{ building: null, avg_dwell_minutes: 0 }];
  }
  return rows;
}

async function getActivityLevelByZone(durationHours, zone) {
  const hours = validateDuration(durationHours);
  const query = `
    SELECT "building_id" AS building,
      COUNT(DISTINCT "tag_id") AS unique_visitors,
      COUNT(*) FILTER (WHERE "direction" = 'entry') AS entries,
      COUNT(*) FILTER (WHERE "direction" = 'exit') AS exits
    FROM "EntryExitLog"
    WHERE "building_id" IN (
      SELECT "building_id" FROM "BUILDING" WHERE "dept_name" = $1
    )
    AND "entry_time" >= NOW() - INTERVAL '${hours} hours'
    GROUP BY "building_id"
    ORDER BY "building_id";
  `;

  const { rows } = await pool.query(query, [zone]);
  if (!rows.length) {
    return {
      activity_level: 'Low',
      total_unique_visitors: 0,
      details_per_building: []
    };
  }
  const totalVisitors = rows.reduce((a, r) => a + parseInt(r.unique_visitors, 10), 0);
  let level = 'Low';
  if (totalVisitors > 150) level = 'High';
  else if (totalVisitors > 80) level = 'Medium';

  return {
    activity_level: level,
    total_unique_visitors: totalVisitors,
    details_per_building: rows,
  };
}

module.exports = {
  getPeakOccupancyByZone,
  getAvgDwellTimeByZone,
  getActivityLevelByZone,
};
