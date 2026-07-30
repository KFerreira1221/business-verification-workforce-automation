require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");

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

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    api: "online",
    database: "disabled",
    storage: "memory",
    timestamp: new Date().toISOString()
  });
});

// =====================================================
// SYSTEM STATUS
// =====================================================

app.get("/api/system/status", (req, res) => {
  res.json({
    api: "online",
    database: "disabled",
    storage: "memory",
    chromium: "ready",
    ollama: "pending",
    businessesLoaded: 0,
    verified: null,
    needsReview: null,
    averageConfidence: null,
    timestamp: new Date().toISOString()
  });
});

// =====================================================
// FALLBACK ROUTE
// =====================================================

app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
