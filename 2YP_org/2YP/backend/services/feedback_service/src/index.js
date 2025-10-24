// src/index.js
const express = require("express");
const axios = require("axios");
const pool = require("../../../db/db");
const cors = require("cors"); // ✅ Added CORS import
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5010;

// ✅ Enable CORS for your React frontend (running on port 5173)
app.use(
  cors({
    origin: "http://localhost:5173", // allow your frontend
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Optional: middleware to parse JSON requests (good practice)
app.use(express.json());

// Default route
app.get("/", (req, res) => {
  res.send("✅ Feedback service is running. Use /feedback endpoints.");
});

// Helper: get building + zone by location
async function getBuildingByLocation(location) {
  const query = `
    SELECT b.building_name, z.zone_name
    FROM Building b
    JOIN Zone z ON b.zone_ID = z.zone_ID
    WHERE b.building_name = $1
    LIMIT 1
  `;
  const result = await pool.query(query, [location]);
  return (
    result.rows[0] || {
      building_name: "Unknown Building",
      zone_name: "Unknown Zone",
    }
  );
}

// 🔹 /feedback - all feedbacks with details
app.get("/feedback", async (req, res) => {
  try {
    const response = await axios.get("http://localhost:3000");
    const rows = response.data.sampleRows;

    const feedbackWithDetails = await Promise.all(
      rows.map(async (row) => {
        let comment = null;
        let rating = null;
        try {
          const parsed = JSON.parse(row.text_content);
          comment = parsed.comment || null;
          rating = parsed.rating || null;
        } catch (e) {}

        const eventQuery =
          "SELECT event_ID, event_name, location FROM Events WHERE event_ID = $1";
        const eventResult = await pool.query(eventQuery, [row.event_id]);
        const event =
          eventResult.rows[0] || { event_name: "Unknown Event", location: null };

        const buildingData = event.location
          ? await getBuildingByLocation(event.location)
          : { building_name: "Unknown Building", zone_name: "Unknown Zone" };

        return {
          event_id: row.event_id,
          event_name: event.event_name,
          building: buildingData.building_name,
          zone: buildingData.zone_name,
          comment,
          rating,
        };
      })
    );

    res.json(feedbackWithDetails);
  } catch (err) {
    console.error("Error in /feedback:", err.message);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

// 🔹 /feedback/filter - filter by sentiment, zone, or building
app.get("/feedback/filter", async (req, res) => {
  try {
    const { sentiment, zone, building } = req.query;
    const response = await axios.get("http://localhost:3000");
    const rows = response.data.sampleRows;

    const feedbackWithDetails = await Promise.all(
      rows.map(async (row) => {
        let comment = null;
        let rating = null;
        try {
          const parsed = JSON.parse(row.text_content);
          comment = parsed.comment || null;
          rating = parsed.rating || null;
        } catch (e) {}

        const eventQuery =
          "SELECT event_ID, event_name, location FROM Events WHERE event_ID = $1";
        const eventResult = await pool.query(eventQuery, [row.event_id]);
        const event =
          eventResult.rows[0] || { event_name: "Unknown Event", location: null };

        const buildingData = event.location
          ? await getBuildingByLocation(event.location)
          : { building_name: "Unknown Building", zone_name: "Unknown Zone" };

        return {
          event_id: row.event_id,
          event_name: event.event_name,
          building: buildingData.building_name,
          zone: buildingData.zone_name,
          comment,
          rating,
        };
      })
    );

    // Apply filters
    let filtered = feedbackWithDetails;
    if (sentiment) {
      if (sentiment === "positive")
        filtered = filtered.filter((r) => r.rating >= 4);
      else if (sentiment === "neutral")
        filtered = filtered.filter((r) => r.rating === 3);
      else if (sentiment === "negative")
        filtered = filtered.filter((r) => r.rating <= 2);
    }

    if (zone)
      filtered = filtered.filter(
        (r) => r.zone.toLowerCase() === zone.toLowerCase()
      );
    if (building)
      filtered = filtered.filter(
        (r) => r.building.toLowerCase() === building.toLowerCase()
      );

    res.json(filtered);
  } catch (err) {
    console.error("Error in /feedback/filter:", err.message);
    res.status(500).json({ error: "Failed to filter feedback" });
  }
});

// 🔹 /feedback/satisfaction?event_id=E01  -> Satisfaction for one event
app.get("/feedback/satisfaction", async (req, res) => {
  try {
    const { event_id } = req.query;
    if (!event_id) {
      return res.status(400).json({ error: "Missing event_id parameter" });
    }

    const response = await axios.get("http://localhost:3000");
    const rows = response.data.sampleRows.filter(
      (r) => String(r.event_id) === String(event_id)
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: `No feedback found for event_id ${event_id}` });
    }

    // Extract ratings
    const ratings = [];
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.text_content);
        if (parsed.rating !== undefined && parsed.rating !== null) {
          ratings.push(parsed.rating);
        }
      } catch (e) {}
    }

    const total = ratings.length;
    const positive = ratings.filter((r) => r >= 4).length;
    const satisfactionRate = total > 0 ? (positive / total) * 100 : 0;

    const eventQuery =
      "SELECT event_ID, event_name, location FROM Events WHERE event_ID = $1";
    const eventResult = await pool.query(eventQuery, [event_id]);
    const event =
      eventResult.rows[0] || { event_name: "Unknown Event", location: null };

    const buildingData = event.location
      ? await getBuildingByLocation(event.location)
      : { building_name: "Unknown Building", zone_name: "Unknown Zone" };

    res.json({
      event_id,
      event_name: event.event_name,
      building: buildingData.building_name,
      zone: buildingData.zone_name,
      satisfaction_rate: satisfactionRate.toFixed(2) + "%",
    });
  } catch (err) {
    console.error("Error in /feedback/satisfaction:", err.message);
    res.status(500).json({ error: "Failed to calculate satisfaction rate" });
  }
});

// 🔹 /feedback/rank?rank=1 -> rank events by average rating
app.get("/feedback/rank", async (req, res) => {
  try {
    const { rank } = req.query;
    const rankNumber = parseInt(rank) || 1;
    const response = await axios.get("http://localhost:3000");
    const rows = response.data.sampleRows;

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

    const eventAverages = [];
    for (const [event_id, ratings] of Object.entries(eventRatings)) {
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;

      const eventQuery =
        "SELECT event_ID, event_name, location FROM Events WHERE event_ID = $1";
      const eventResult = await pool.query(eventQuery, [event_id]);
      const event =
        eventResult.rows[0] || { event_name: "Unknown Event", location: null };

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

    eventAverages.sort((a, b) => b.average_rating - a.average_rating);

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
        event.rank = currentRank;
      }
    });

    const filtered = eventAverages.filter((e) => e.rank === rankNumber);
    if (filtered.length === 0) {
      return res
        .status(404)
        .json({ message: `No events found for rank ${rankNumber}` });
    }

    res.json({ rank: rankNumber, events: filtered });
  } catch (err) {
    console.error("Error in /feedback/rank:", err.message);
    res.status(500).json({ error: "Failed to calculate event rankings" });
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Feedback service running on http://localhost:${PORT}`);
});
