const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Import heatmap analytics routes
const heatmapRoutes = require('./services/Heatmapanalytic-service/heatmapRoutes');

// Mount analytics routes under /api/heatmap
app.use('/api/heatmap', heatmapRoutes);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
