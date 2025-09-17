const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const heatmapRoutes = require('./routes/heatmapRoutes');
app.use('/api/heatmap', heatmapRoutes);

app.get('/', (req, res) => {
  res.send('Heatmap Analytics Backend running');
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
