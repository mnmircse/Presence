const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const developerAuth = require("../middleware/developerAuth");

// CREATE
router.post("/users", developerAuth, async (req, res) => {
  const { name, email } = req.body;

  try {
    const [result] = await pool.query(
      "INSERT INTO users (name, email) VALUES (?, ?)",
      [name, email]
    );

    res.json({ message: "User created ✅", id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ
router.get("/users", developerAuth, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE
router.put("/users/:id", developerAuth, async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;

  try {
    await pool.query(
      "UPDATE users SET name = ?, email = ? WHERE id = ?",
      [name, email, id]
    );

    res.json({ message: "User updated ✅" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete("/users/:id", developerAuth, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM users WHERE id = ?", [id]);
    res.json({ message: "User deleted ✅" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;