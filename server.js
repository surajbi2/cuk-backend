import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import momMeetingRoutes from './routes/momMeetingRoutes.js';
import surveyRoutes from './routes/surveyRoutes.js';
import debugRoutes from './routes/debugRoutes.js';
import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import initializeTables from './config/initDb.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Debug middleware for all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Ensure "uploads" directory exists
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadPath));

// Database Connection Pooling
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'iqac',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Export the database connection
export default db;

// File Download Route for MoM (Fixed)
app.get('/api/mom/download/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const query = `SELECT file_name, file_data, file_mimetype FROM minutesofmeeting WHERE id = ?`;
    const [result] = await db.query(query, [id]);

    if (result.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }

    const file = result[0];

    if (!file.file_data) {
      return res.status(404).json({ message: 'File content not found' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);
    res.setHeader('Content-Type', file.file_mimetype);
    res.end(Buffer.from(file.file_data)); // Convert BLOB to buffer
  } catch (error) {
    console.error('❌ Error retrieving file:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/mom', momMeetingRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/surveys', surveyRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    message: 'Server Error', 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database and start server
const PORT = process.env.PORT || 5000;
initializeTables()
  .then(() => {
    app.listen(PORT, () => {
      console.log('Database configuration:', {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        database: process.env.DB_NAME || 'iqac'
      });
      console.log('JWT_SECRET:', process.env.JWT_SECRET);
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch(error => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });