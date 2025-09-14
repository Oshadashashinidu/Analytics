const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3000;

const heatmapRoutes = require('./routes/heatmapRoutes');

app.use(cors());
app.use(express.json());

app.use('/api/heatmap', heatmapRoutes);

app.get('/', (req, res) => {
  res.send('Heatmap Analytics Backend is running');
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
