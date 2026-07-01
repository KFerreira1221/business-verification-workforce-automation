require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./services/db");
const businessRoutes = require("./routes/businessRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Business Verification API Running",
    routes: ["GET /health", "GET /api/businesses", "POST /api/businesses"]
  });
});

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

app.use("/api/businesses", businessRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const dashboardRoutes = require("./routes/dashboardRoutes");
app.use("/api/dashboard", dashboardRoutes);
