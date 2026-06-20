require("dotenv").config();

const express = require("express");
const cors = require("cors");

const businessRoutes = require("./routes/businessRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/businesses", businessRoutes);

app.get("/", (req, res) => {
  res.send("Business Verification API Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
