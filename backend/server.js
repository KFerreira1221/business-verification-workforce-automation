require("dotenv").config();
const loadRoutes = require("./routes/loadRoutes");
const path = require("path");
const express = require("express");
const cors = require("cors");
const pool = require("./services/db");

const businessRoutes = require("./routes/businessRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const workflowRoutes = require("./routes/workflowRoutes");
const queueRoutes = require("./routes/queueRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/api/load", loadRoutes);
app.use(express.static(path.join(__dirname, "public")));
app.use("/screenshots", express.static(path.join(__dirname, "screenshots")));

app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS database_time");
    res.json({
      status: "ok",
      database: "connected",
      database_time: result.rows[0].database_time
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({ status: "error", database: "not connected" });
  }
});

app.get("/api/system/status", (req, res) => {
  res.json({
    api: "online",
    database: "connected",
    chromium: "ready",
    ollama: "pending",
    businessesLoaded: 0,
    verified: 0,
    needsReview: 0,
    averageConfidence: 0
  });
});

app.use("/api/businesses", businessRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/workflows", workflowRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/notifications", notificationRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});