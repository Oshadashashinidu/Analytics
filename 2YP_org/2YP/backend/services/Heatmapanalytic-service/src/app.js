// Replace normal dotenv import with dotenvx
const dotenvx = require('@dotenvx/dotenvx');

// Load and decrypt environment variables from encrypted .env file
dotenvx.config();

// Now you can safely access decrypted environment variables
console.log('Loaded DATABASE_URL:', process.env.DATABASE_URL);

// Required imports after env vars loaded
const express = require('express');
const cors = require('cors');
const app = express();

// Configure app
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

// Logging middleware for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Import routes
const heatmapRoutes = require('./routes/heatmapRoutes');
app.use('/api/heatmap', heatmapRoutes);

app.get('/', (req, res) => {
  res.send('Heatmap Analytics Backend Running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
