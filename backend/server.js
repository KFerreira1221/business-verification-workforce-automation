require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");

const pool = require("./services/db");

const loadRoutes = require("./routes/loadRoutes");
const businessRoutes = require("./routes/businessRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const workflowRoutes = require("./routes/workflowRoutes");
const queueRoutes = require("./routes/queueRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));
app.use(
  "/screenshots",
  express.static(path.join(__dirname, "screenshots"))
);

// =====================================================
// ROUTES
// =====================================================

app.use("/api/load", loadRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/workflows", workflowRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/notifications", notificationRoutes);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/health", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT NOW() AS database_time"
    );

    res.json({
      status: "ok",
      database: "connected",
      database_time: result.rows[0].database_time
    });
  } catch (error) {
    console.error("Health check failed:", error);

    res.status(500).json({
      status: "error",
      database: "not connected",
      error: error.message
    });
  }
});

// =====================================================
// SYSTEM STATUS
// =====================================================

app.get("/api/system/status", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    let businessesLoaded = 0;

    try {
      const businesses = await pool.query(
        "SELECT COUNT(*)::int AS total FROM businesses"
      );

      businessesLoaded =
        businesses.rows[0].total;
    } catch (err) {
      console.warn(
        "Unable to count businesses:",
        err.message
      );
    }

    res.json({
      api: "online",
      database: "connected",
      chromium: "ready",
      ollama: "pending",
      businessesLoaded,
      verified: null,
      needsReview: null,
      averageConfidence: null
    });
  } catch (error) {
    console.error(
      "System status failed:",
      error
    );

    res.status(500).json({
      api: "online",
      database: "not connected",
      chromium: "unknown",
      ollama: "pending",
      businessesLoaded: 0,
      verified: null,
      needsReview: null,
      averageConfidence: null,
      error: error.message
    });
  }
});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
