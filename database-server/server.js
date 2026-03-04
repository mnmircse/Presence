import express from 'express';
import pool from './db.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// optionally expose pool via locals if handlers prefer
app.locals.db = pool;

app.get('/', (req, res) => {
  res.json({ message: 'Database Server' });
});

// health check that queries the database
app.get('/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1');
    res.json({ db: 'ok', rows });
  } catch (err) {
    console.error('Database health check failed', err);
    res.status(500).json({ db: 'error', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
