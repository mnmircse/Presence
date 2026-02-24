require("dotenv").config();
const express = require("express");
const pool = require("./config/db.js");
const developerRoutes = require("./routes/developer");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server Running 🚀");
});

/*// Test DB Route
app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    res.json({
      message: "Database working ✅",
      result: rows
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});*/ 

app.use("/dev", developerRoutes);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});