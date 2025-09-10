// index.js
const express = require('express');
const bodyParser = require('body-parser');
const exportRoutes = require('./routes/exportRoutes');

const app = express();
const PORT = 5005;

app.use(bodyParser.json());

// API routes
app.use('/api/export', exportRoutes);

app.get('/', (req, res) => {
  res.send('Exhibition Analytics API is running 🚀');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
