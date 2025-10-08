// src/index.js
const express = require("express");
const axios = require("axios");
const pool = require("../../../db/db"); // path to your db.js
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5010;

// Default route
app.get("/", (req, res) => {
  res.send("✅ Feedback service is running. Use /feedback to get data.");
});

// Helper: get building + zone by location name
async function getBuildingByLocation(location) {
  const query = `
    SELECT b.building_name, z.zone_name
    FROM Building b
    JOIN Zone z ON b.zone_ID = z.zone_ID
    WHERE b.building_name = $1
    LIMIT 1
  `;
  const result = await pool.query(query, [location]);
  return result.rows[0] || { building_name: "Unknown Building", zone_name: "Unknown Zone" };
}

// 🔹 Endpoint: get feedback with event + building + satisfaction_rate
app.get("/feedback", async (req, res) => {
  try {
    const response = await axios.get("http://localhost:3000");
    const rows = response.data.sampleRows;

    const feedbackWithDetails = await Promise.all(
      rows.map(async row => {
        let comment = null;
        let rating = null;
        try {
          const parsed = JSON.parse(row.text_content);
          comment = parsed.comment || null;
          rating = parsed.rating || null;
        } catch (e) {}

        // get event details from your database
        const eventQuery = "SELECT event_ID, event_name, location FROM Events WHERE event_ID = $1";
        const eventResult = await pool.query(eventQuery, [row.event_id]);
        const event = eventResult.rows[0] || { event_name: "Unknown Event", location: null };

        const buildingData = event.location
          ? await getBuildingByLocation(event.location)
          : { building_name: "Unknown Building", zone_name: "Unknown Zone" };

        return {
          event_id: row.event_id,
          event_name: event.event_name,
          building: buildingData.building_name,
          zone: buildingData.zone_name,
          comment,
          rating
        };
      })
    );

    // calculate satisfaction rate (global)
    const total = feedbackWithDetails.length;
    const positive = feedbackWithDetails.filter(f => f.rating >= 4).length;
    const satisfactionRate = total > 0 ? (positive / total) * 100 : 0;

    const finalResult = feedbackWithDetails.map(item => ({
      ...item,
      satisfaction_rate: satisfactionRate.toFixed(2) + "%"
    }));

    res.json(finalResult);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

// 🔹 Endpoint: filter feedback by sentiment + zone + building
app.get("/feedback/filter", async (req, res) => {
  try {
    const { sentiment, zone, building } = req.query;

    const response = await axios.get("http://localhost:3000");
    const rows = response.data.sampleRows;

    const feedbackWithDetails = await Promise.all(
      rows.map(async row => {
        let comment = null;
        let rating = null;
        try {
          const parsed = JSON.parse(row.text_content);
          comment = parsed.comment || null;
          rating = parsed.rating || null;
        } catch (e) {}

        const eventQuery = "SELECT event_ID, event_name, location FROM Events WHERE event_ID = $1";
        const eventResult = await pool.query(eventQuery, [row.event_id]);
        const event = eventResult.rows[0] || { event_name: "Unknown Event", location: null };

        const buildingData = event.location
          ? await getBuildingByLocation(event.location)
          : { building_name: "Unknown Building", zone_name: "Unknown Zone" };

        return {
          event_id: row.event_id,
          event_name: event.event_name,
          building: buildingData.building_name,
          zone: buildingData.zone_name,
          comment,
          rating
        };
      })
    );

    let filtered = feedbackWithDetails;

    // filter by sentiment
    if (sentiment) {
      if (sentiment === "positive") filtered = filtered.filter(r => r.rating >= 4);
      else if (sentiment === "neutral") filtered = filtered.filter(r => r.rating === 3);
      else if (sentiment === "negative") filtered = filtered.filter(r => r.rating <= 2);
    }

    // filter by zone
    if (zone) filtered = filtered.filter(r => r.zone.toLowerCase() === zone.toLowerCase());

    // filter by building
    if (building) filtered = filtered.filter(r => r.building.toLowerCase() === building.toLowerCase());

    res.json(filtered);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to filter feedback" });
  }
});

// 🔹 Endpoint: satisfaction rate only
app.get("/feedback/satisfaction", async (req, res) => {
  try {
    const response = await axios.get("http://localhost:3000");
    const rows = response.data.sampleRows;

    const feedback = rows.map(row => {
      let rating = null;
      try {
        const parsed = JSON.parse(row.text_content);
        rating = parsed.rating || null;
      } catch (e) {}
      return { rating };
    });

    const total = feedback.length;
    const positive = feedback.filter(f => f.rating >= 4).length;
    const satisfactionRate = total > 0 ? (positive / total) * 100 : 0;

    res.json({ satisfaction_rate: satisfactionRate.toFixed(2) + "%" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to calculate satisfaction rate" });
  }
});

// 🔹 NEW ENDPOINT: event ranking by average rating
app.get("/feedback/rank", async (req, res) => {
  try {
    const { rank } = req.query; // e.g., rank=1 or rank=3
    const rankNumber = parseInt(rank) || 1;

    const response = await axios.get("http://localhost:3000");
    const rows = response.data.sampleRows;

    // Step 1: Group ratings by event_id
    const eventRatings = {};

    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.text_content);
        const rating = parsed.rating;
        if (rating !== undefined && rating !== null) {
          if (!eventRatings[row.event_id]) eventRatings[row.event_id] = [];
          eventRatings[row.event_id].push(rating);
        }
      } catch (e) {}
    }

    // Step 2: Calculate average rating per event
    const eventAverages = [];
    for (const [event_id, ratings] of Object.entries(eventRatings)) {
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;

      // Get event info
      const eventQuery = "SELECT event_ID, event_name, location FROM Events WHERE event_ID = $1";
      const eventResult = await pool.query(eventQuery, [event_id]);
      const event = eventResult.rows[0] || { event_name: "Unknown Event", location: null };

      // Get building + zone
      const buildingData = event.location
        ? await getBuildingByLocation(event.location)
        : { building_name: "Unknown Building", zone_name: "Unknown Zone" };

      eventAverages.push({
        event_id,
        event_name: event.event_name,
        building: buildingData.building_name,
        zone: buildingData.zone_name,
        average_rating: parseFloat(avg.toFixed(2)),
      });
    }

    // Step 3: Sort by average rating (descending)
    eventAverages.sort((a, b) => b.average_rating - a.average_rating);

    // Step 4: Assign ranks (handle ties)
    let currentRank = 1;
    let lastRating = null;
    eventAverages.forEach((event, index) => {
      if (lastRating === null) {
        event.rank = currentRank;
        lastRating = event.average_rating;
      } else if (event.average_rating < lastRating) {
        currentRank = index + 1;
        event.rank = currentRank;
        lastRating = event.average_rating;
      } else {
        event.rank = currentRank; // same rank if same rating
      }
    });

    // Step 5: Filter by rank if requested
    const filtered = eventAverages.filter(e => e.rank === rankNumber);

    if (filtered.length === 0) {
      return res.status(404).json({ message: `No events found for rank ${rankNumber}` });
    }

    res.json({
      rank: rankNumber,
      events: filtered,
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to calculate event rankings" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Feedback service running on http://localhost:${PORT}`);
});
