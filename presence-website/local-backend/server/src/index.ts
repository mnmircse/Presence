import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { attendanceRouter } from './routes/attendance';
import { sessionsRouter } from './routes/sessions';
import { classesRouter } from './routes/classes';
import { faceRouter } from './routes/face';
import { timetableRouter } from './routes/timetable';
import { wifiRouter } from './routes/wifi';
import { errorHandler } from './middleware/errorHandler';
import { pool } from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
// deleted process.env.CORS_ORIGIN || 
// Middleware
// app.use(cors({
//   origin: 'http://192.168.60.1:8080',
//   credentials: true
// }));
// app.use(cors({
//   origin: [
//     'http://localhost:3000',
//     'http://localhost:5173',
//     'http://192.168.1.3:8080',
//     'http://192.168.60.1:8080'
//   ],
//   credentials: true
// }));
//if ip changes usually 
app.use(cors({
  origin: true,        // reflect request origin automatically
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));



app.use(express.json({ limit: '10mb' })); // Larger limit for face embeddings

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/classes', classesRouter);
app.use('/api/face', faceRouter);
app.use('/api/timetable', timetableRouter);
app.use('/api/wifi', wifiRouter);

// Error handling
app.use(errorHandler);

// Start server
async function start() {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📚 API docs: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
