const pool = require('../utils/db');

const getPeakOccupancy = async (hours, zone, building) => {
  // Example SQL to get peak occupancy in given interval and location
  const intervalHours = parseInt(hours, 10);
  const query = `
    SELECT MAX(occupancy) AS peak
    FROM (
      SELECT DATE_TRUNC('hour', event_time) AS hour,
        COUNT(DISTINCT visitor_id) AS occupancy
      FROM building_entry_logs
      WHERE zone = $1 AND building = $2 AND event_time >= NOW() - INTERVAL '${intervalHours} hours'
      GROUP BY hour
    ) sub;
  `;
  const { rows } = await pool.query(query, [zone, building]);
  return rows[0].peak || 0;
};

const getAvgDwellTime = async (hours, zone, building) => {
  const intervalHours = parseInt(hours, 10);

  // Average dwell time in minutes calculated from entry/exit pairs per visitor
  const query = `
    WITH visits AS (
      SELECT visitor_id,
         MIN(event_time) FILTER (WHERE event_type = 'entry') AS entry_time,
         MAX(event_time) FILTER (WHERE event_type = 'exit') AS exit_time
      FROM building_entry_logs
      WHERE zone = $1 AND building = $2 AND event_time >= NOW() - INTERVAL '${intervalHours} hours'
      GROUP BY visitor_id
    )
    SELECT AVG(EXTRACT(EPOCH FROM (exit_time - entry_time)) / 60) AS avg_dwell_minutes
    FROM visits
    WHERE entry_time IS NOT NULL AND exit_time IS NOT NULL;
  `;
  const { rows } = await pool.query(query, [zone, building]);
  return parseFloat(rows[0].avg_dwell_minutes) || 0;
};

const getActivityLevel = async (hours) => {
  const intervalHours = parseInt(hours, 10);

  const query = `
    SELECT COUNT(DISTINCT visitor_id) AS unique_visitors,
           COUNT(*) FILTER (WHERE event_type='entry') AS entries,
           COUNT(*) FILTER (WHERE event_type='exit') AS exits
    FROM building_entry_logs
    WHERE event_time >= NOW() - INTERVAL '${intervalHours} hours';
  `;

  const { rows } = await pool.query(query);

  const visitors = parseInt(rows[0].unique_visitors, 10);
  let level = 'Low';
  if (visitors > 50) level = 'High';
  else if (visitors > 20) level = 'Medium';

  return {
    unique_visitors: visitors,
    entries: parseInt(rows[0].entries, 10),
    exits: parseInt(rows[0].exits, 10),
    activity_level: level,
  };
};

module.exports = {
  getPeakOccupancy,
  getAvgDwellTime,
  getActivityLevel,
};
