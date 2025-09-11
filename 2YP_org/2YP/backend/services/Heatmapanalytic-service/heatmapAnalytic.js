const pool = require('../../db/db'); // Adjust this path if needed

function validateDuration(durationHours) {
  const hours = parseInt(durationHours);
  if (isNaN(hours) || hours <= 0 || hours > 168) {
    return 24;
  }
  return hours;
}

async function getPeakOccupancy(durationHours = 24) {
  durationHours = validateDuration(durationHours);

  const query = `
    WITH events AS (
      SELECT event_time,
             CASE WHEN event_type = 'entry' THEN 1 ELSE -1 END AS change
      FROM building_entry_logs
      WHERE event_time >= NOW() - INTERVAL '${durationHours} HOURS'
    ),
    running_sum AS (
      SELECT event_time,
             SUM(change) OVER (ORDER BY event_time ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS occupancy
      FROM events
    )
    SELECT COALESCE(MAX(occupancy), 0) AS peak_occupancy
    FROM running_sum;
  `;

  try {
    const result = await pool.query(query);
    return result.rows[0];
  } catch (err) {
    console.error('Error in getPeakOccupancy:', err);
    throw err;
  }
}

async function getAvgDwellTime(durationHours = 24) {
  durationHours = validateDuration(durationHours);

  const query = `
    SELECT AVG(dwell_seconds) AS avg_dwell_seconds FROM (
      SELECT
        visitor_id,
        EXTRACT(EPOCH FROM (exit_time - entry_time)) AS dwell_seconds
      FROM (
        SELECT
          visitor_id,
          event_time AS entry_time,
          LEAD(event_time) OVER (PARTITION BY visitor_id ORDER BY event_time) AS exit_time,
          LEAD(event_type) OVER (PARTITION BY visitor_id ORDER BY event_time) AS exit_type
        FROM building_entry_logs
        WHERE event_time >= NOW() - INTERVAL '${durationHours} HOURS'
      ) sub
      WHERE exit_type = 'exit'
    ) dwell_times;
  `;

  try {
    const result = await pool.query(query);
    return result.rows[0];
  } catch (err) {
    console.error('Error in getAvgDwellTime:', err);
    throw err;
  }
}

async function getActivityLevel(durationHours = 24) {
  try {
    const peakResult = await getPeakOccupancy(durationHours);
    const dwellResult = await getAvgDwellTime(durationHours);

    const peak = peakResult.peak_occupancy || 0;
    const avgDwell = dwellResult.avg_dwell_seconds ? dwellResult.avg_dwell_seconds / 60 : 0; // seconds to minutes

    let level = 'Low';
    if (peak > 150 || avgDwell > 25) level = 'High';
    else if ((peak >= 80 && peak <= 150) || (avgDwell >= 15 && avgDwell <= 25)) level = 'Medium';

    return { activity_level: level, peak_occupancy: peak, avg_dwell_minutes: avgDwell.toFixed(2) };
  } catch (err) {
    console.error('Error in getActivityLevel:', err);
    throw err;
  }
}

module.exports = {
  getPeakOccupancy,
  getAvgDwellTime,
  getActivityLevel,
};
