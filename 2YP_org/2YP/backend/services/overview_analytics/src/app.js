const express = require("express");
const analyticsRoutes = require("./routes/analyticsRoutes");

const app = express();
app.use(express.json());

// Routes
app.use("/analytics", analyticsRoutes);

// Start server
const PORT = process.env.PORT || 5006;
app.listen(PORT, () => {
  console.log(`Overview Analytics Service running on port ${PORT}`);
});
